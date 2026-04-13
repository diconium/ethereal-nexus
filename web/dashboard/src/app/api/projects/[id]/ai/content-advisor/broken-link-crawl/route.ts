import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { HttpStatus } from '@/app/api/utils';
import {
  getContentAdvisorAgentConfigs,
  getPageUrlMappings,
} from '@/data/ai/actions';
import {
  fetchPageSource,
  resolvePageReferenceWithMapping,
} from '@/data/ai/analyzer';

// ---------------------------------------------------------------------------
// Streaming event types
// ---------------------------------------------------------------------------

export type BrokenLinkCrawlEvent =
  | {
      type: 'source';
      url: string;
      status: number;
      title: string | null;
      linkCount: number;
    }
  | {
      type: 'links';
      urls: string[];
      /** Displayed label (AEM path when a mapping was applied, else the URL) */
      labels?: Record<string, string>;
    }
  | {
      type: 'checked';
      url: string;
      ok: boolean;
      status: number;
      foundOn: string;
      /** Nearest ancestor web-component tag name, e.g. "my-card", or null */
      ancestorComponent: string | null;
    }
  | {
      type: 'done';
      summary: string;
      brokenCount: number;
      totalChecked: number;
    };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SKIPPED_SCHEMES = /^(mailto:|tel:|javascript:|data:|#)/i;

type LinkRef = { url: string; ancestorComponent: string | null };

/**
 * Walk backwards through `html` from `matchIndex` to find the nearest
 * ancestor custom-element opening tag (tag name containing a hyphen).
 */
function findAncestorWebComponent(
  html: string,
  matchIndex: number,
): string | null {
  const fragment = html.slice(0, matchIndex);
  const openTagRe = /<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)(?:\s[^>]*)?\s*\/?>/gi;
  let lastMatch: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = openTagRe.exec(fragment)) !== null) {
    lastMatch = m[1].toLowerCase();
  }
  return lastMatch;
}

function extractLinks(html: string, baseUrl: string): LinkRef[] {
  const hrefRe = /href=["']([^"']+)["']/gi;
  const seen = new Map<string, LinkRef>();
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1].trim();
    if (SKIPPED_SCHEMES.test(raw)) continue;
    try {
      const url = new URL(raw, baseUrl);
      url.hash = '';
      const resolved = url.href;
      if (!seen.has(resolved)) {
        seen.set(resolved, {
          url: resolved,
          ancestorComponent: findAncestorWebComponent(html, m.index),
        });
      }
    } catch {
      // Unparseable — skip
    }
  }
  return Array.from(seen.values());
}

async function checkLink(
  url: string,
): Promise<{ url: string; status: number; ok: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'EtherealNexus-ContentAdvisor/1.0 (+https://ethereal-nexus.com)',
      },
    });
    clearTimeout(timeout);
    if (response.status === 405) {
      const gc = new AbortController();
      const gt = setTimeout(() => gc.abort(), 10_000);
      const gr = await fetch(url, {
        method: 'GET',
        signal: gc.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'EtherealNexus-ContentAdvisor/1.0 (+https://ethereal-nexus.com)',
        },
      });
      clearTimeout(gt);
      return { url, status: gr.status, ok: gr.ok };
    }
    return { url, status: response.status, ok: response.ok };
  } catch {
    clearTimeout(timeout);
    return { url, status: 0, ok: false };
  }
}

function normaliseOrigin(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  }
  return `https://${trimmed.replace(/\/+$/, '')}`;
}

function enc(event: BrokenLinkCrawlEvent): string {
  return JSON.stringify(event) + '\n';
}

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  environmentId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  agentConfigId: z.string().uuid(),
  page: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json('Unauthorized', {
      status: HttpStatus.UNAUTHORIZED,
    });
  }

  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json('Invalid JSON body', {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const { environmentId, agentConfigId, page } = parsed.data;

  // Load agent config and URL mappings in parallel
  const [agentsResult, mappingsResult] = await Promise.all([
    getContentAdvisorAgentConfigs(projectId, environmentId),
    getPageUrlMappings(projectId, environmentId),
  ]);

  if (!agentsResult.success) {
    return NextResponse.json(
      { error: agentsResult.error.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  const agent = agentsResult.data.find((a) => a.id === agentConfigId);
  if (!agent || agent.key !== 'broken-link') {
    return NextResponse.json(
      { error: 'Agent not found or is not a broken-link agent.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const mappings = mappingsResult.success ? mappingsResult.data : [];

  const crawlConfig = agent.provider_config as {
    crawl_depth?: number | null;
    allowed_domain?: string | null;
  } | null;
  const maxDepth = crawlConfig?.crawl_depth ?? 1;
  const rawDomain = crawlConfig?.allowed_domain ?? null;

  // Build the stream
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: BrokenLinkCrawlEvent) => {
        try {
          controller.enqueue(new TextEncoder().encode(enc(event)));
        } catch {
          // Stream already closed — ignore
        }
      };

      try {
        // 1. Resolve the starting page using the mapping table
        const resolved = resolvePageReferenceWithMapping(page, mappings);

        if (!resolved.url.startsWith('http')) {
          emit({
            type: 'done',
            summary: resolved.aemPath
              ? `No URL mapping found for AEM path "${resolved.aemPath}". Add a mapping in the AI settings to enable crawling.`
              : `Page "${page}" is not an absolute URL and no mapping was found. Add a mapping in the AI settings.`,
            brokenCount: 0,
            totalChecked: 0,
          });
          controller.close();
          return;
        }

        // 2. Fetch the resolved starting page
        const source = await fetchPageSource(resolved.url);
        // Preserve the AEM path in source.reference for issue page_path
        if (resolved.aemPath) {
          (source as { reference: string }).reference = resolved.aemPath;
        }

        const baseOrigin = rawDomain
          ? normaliseOrigin(rawDomain)
          : new URL(source.url).origin;

        // 3. Extract seed links and emit the list immediately
        const seedLinks = extractLinks(source.html, source.url).filter((l) =>
          l.url.startsWith(baseOrigin),
        );

        // Emit the source page status so the UI can show it as a header row
        emit({
          type: 'source',
          url: source.url,
          status: source.status,
          title: source.title ?? null,
          linkCount: seedLinks.length,
        });

        const queue: Array<{
          url: string;
          depth: number;
          foundOnUrl: string;
          ancestorComponent: string | null;
        }> = [];
        const visited = new Set<string>();
        const checked = new Set<string>();
        let brokenCount = 0;

        for (const link of seedLinks) {
          if (!visited.has(link.url)) {
            visited.add(link.url);
            queue.push({
              url: link.url,
              depth: 1,
              foundOnUrl: source.url,
              ancestorComponent: link.ancestorComponent,
            });
          }
        }

        // Emit the full list of links discovered at depth-1 immediately
        // Include a label map so the UI can show the AEM origin context
        const startLabel = resolved.aemPath
          ? `${resolved.aemPath} → ${resolved.url}`
          : resolved.url;
        emit({
          type: 'links',
          urls: [...visited],
          labels: { [source.url]: startLabel },
        });

        // 4. Process the queue and emit per-link results
        while (queue.length > 0) {
          const batch = queue.splice(0, 20);

          await Promise.all(
            batch.map(async ({ url, depth, foundOnUrl, ancestorComponent }) => {
              if (checked.has(url)) return;
              checked.add(url);

              const result = await checkLink(url);
              if (!result.ok) brokenCount++;

              emit({
                type: 'checked',
                url: result.url,
                ok: result.ok,
                status: result.status,
                foundOn: foundOnUrl,
                ancestorComponent,
              });

              // Follow into next depth level
              if (result.ok && depth < maxDepth) {
                try {
                  const nextSource = await fetchPageSource(url);
                  const nextLinks = extractLinks(nextSource.html, url).filter(
                    (l) => l.url.startsWith(baseOrigin),
                  );

                  for (const nextLink of nextLinks) {
                    if (!visited.has(nextLink.url)) {
                      visited.add(nextLink.url);
                      queue.push({
                        url: nextLink.url,
                        depth: depth + 1,
                        foundOnUrl: url,
                        ancestorComponent: nextLink.ancestorComponent,
                      });
                      // Emit newly discovered link so the UI can add it
                      emit({ type: 'links', urls: [nextLink.url] });
                    }
                  }
                } catch {
                  // Can't fetch deeper page — skip silently
                }
              }
            }),
          );
        }

        const total = checked.size;
        emit({
          type: 'done',
          summary: brokenCount
            ? `Found ${brokenCount} broken link${brokenCount === 1 ? '' : 's'} across ${total} link${total === 1 ? '' : 's'} checked (depth ${maxDepth}).`
            : `No broken links found across ${total} link${total === 1 ? '' : 's'} checked (depth ${maxDepth}).`,
          brokenCount,
          totalChecked: total,
        });
      } catch (err) {
        emit({
          type: 'done',
          summary: `Crawl failed: ${err instanceof Error ? err.message : String(err)}`,
          brokenCount: 0,
          totalChecked: 0,
        });
      }

      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
