import { z } from 'zod';
import type {
  ContentAdvisorAgentConfig,
  ContentAdvisorIssueInput,
  PageUrlMapping,
} from './dto';
import { contentAdvisorIssueInputSchema } from './dto';
import { callFoundryChat } from '@/lib/ai-providers/microsoft-foundry';
import { logger } from '@/lib/logger';

type PageAnalysisSource = {
  reference: string;
  url: string;
  title?: string | null;
  text: string;
  html: string;
  status: number;
};

const contentAdvisorAgentResponseSchema = z.object({
  summary: z.string().default(''),
  issues: z.array(
    z.object({
      issue_type: contentAdvisorIssueInputSchema.shape.issue_type,
      severity: contentAdvisorIssueInputSchema.shape.severity,
      status: contentAdvisorIssueInputSchema.shape.status,
      title: z.string().min(2),
      description: z.string().min(1),
      suggestion: z.string().min(1),
      reasoning: z.string().min(1),
      page_path: z.string().min(1).optional().nullable(),
      component_path: z.string().min(1).optional().nullable(),
    }),
  ),
});

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function issue(
  input: Omit<ContentAdvisorIssueInput, 'page_url' | 'page_title'>,
  source: Pick<PageAnalysisSource, 'url' | 'title'>,
): ContentAdvisorIssueInput {
  return {
    page_url: source.url,
    page_title: source.title || null,
    ...input,
  };
}

export function resolveContentAdvisorPageUrl(pageReference: string) {
  const trimmed = pageReference.trim();
  if (!trimmed) {
    throw new Error('Page reference is required.');
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Like `resolveContentAdvisorPageUrl` but also checks the supplied mapping
 * table for an AEM path → frontend URL override.
 *
 * Returns:
 *   { url: string; aemPath: string | null }
 *
 * - `url` is the URL that should actually be fetched (the frontend URL when a
 *   mapping exists, or the original reference when it is already absolute).
 * - `aemPath` is non-null when a mapping was applied, so callers can store the
 *   original AEM path in issue.page_path while using the frontend URL for
 *   HTTP requests.
 */
export function resolvePageReferenceWithMapping(
  pageReference: string,
  mappings: Pick<PageUrlMapping, 'aem_path' | 'frontend_url'>[],
): { url: string; aemPath: string | null } {
  const trimmed = pageReference.trim();

  // Already an absolute URL — no lookup needed
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: trimmed, aemPath: null };
  }

  // Normalise to an AEM path (ensure leading slash)
  const aemPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Look up in the mapping table
  const mapping = mappings.find((m) => m.aem_path === aemPath);
  if (mapping) {
    return { url: mapping.frontend_url, aemPath };
  }

  // No mapping found — return the raw path (will fail to crawl but won't crash)
  return { url: aemPath, aemPath: null };
}

function extractJson(text: string): unknown {
  const fencedBlock = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedBlock?.[1]?.trim() || text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const objectStart = candidate.indexOf('{');
    const objectEnd = candidate.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
      return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = candidate.indexOf('[');
    const arrayEnd = candidate.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(candidate.slice(arrayStart, arrayEnd + 1));
    }

    throw new Error('Agent did not return valid JSON.');
  }
}

function buildAgentPrompt(
  agent: ContentAdvisorAgentConfig,
  source: PageAnalysisSource,
) {
  return [
    `Look at this page path: ${source.reference} and find the issues.`,
    'Return machine-readable JSON only using this exact shape:',
    '{',
    '  "summary": string,',
    '  "issues": [',
    '    {',
    '      "issue_type": "stale-content" | "incorrect-content" | "incoherent-content" | "duplicate-content" | "broken-content",',
    '      "severity": "critical" | "warning" | "info",',
    '      "status": "open",',
    '      "title": string,',
    '      "description": string,',
    '      "suggestion": string,',
    '      "reasoning": string',
    '    }',
    '  ]',
    '}',
    'Rules:',
    '- Return JSON only. No markdown fences, no prose before or after the JSON.',
    '- Only include issues that are clearly supported by the provided page content.',
    '- If no issues are found, return {"summary":"No issues found.","issues":[]}.',
    '- Use concise, actionable titles and suggestions.',
    '- Set every new issue status to "open".',
    '- Do not invent facts that are not visible in the page content.',
    `Agent key: ${agent.key}`,
    `Page reference: ${source.reference}`,
    `Resolved page URL: ${source.url}`,
  ].join('\n');
}

function fallbackAnalyzePageWithAgent(
  agent: ContentAdvisorAgentConfig,
  source: PageAnalysisSource,
) {
  const lowerText = source.text.toLowerCase();
  const issues: ContentAdvisorIssueInput[] = [];

  if (!source.status || source.status >= 400) {
    issues.push(
      issue(
        {
          issue_type: 'broken-content',
          severity: 'critical',
          status: 'open',
          title: 'Page could not be loaded',
          description: `The scheduled page returned HTTP status ${source.status}.`,
          suggestion:
            'Fix the page availability before running content reviews again.',
          reasoning:
            'The request failed, so no trustworthy page content was available for analysis.',
          page_path: source.reference,
          component_path: null,
        },
        source,
      ),
    );
    return {
      summary: `1 issue found by fallback analysis for ${agent.name}.`,
      issues,
    };
  }

  if (agent.key === 'seo-performance' || agent.key === 'compliance') {
    const oldYears = Array.from(source.text.matchAll(/\b(20\d{2})\b/g))
      .map((match) => Number(match[1]))
      .filter((year) => year < new Date().getFullYear() - 1);

    if (oldYears.length) {
      issues.push(
        issue(
          {
            issue_type: 'stale-content',
            severity: 'warning',
            status: 'open',
            title: 'Potentially stale year reference',
            description: `Found older year references (${oldYears.join(', ')}) that may indicate outdated content.`,
            suggestion:
              'Review the page copy and confirm whether older year references are still valid.',
            reasoning:
              'Older year values often point to outdated campaigns, pricing windows, or legal references.',
            page_path: source.reference,
            component_path: null,
          },
          source,
        ),
      );
    }
  }

  if (agent.key === 'content') {
    if (/lorem ipsum|todo|tbd|coming soon/i.test(lowerText)) {
      issues.push(
        issue(
          {
            issue_type: 'incorrect-content',
            severity: 'warning',
            status: 'open',
            title: 'Placeholder copy detected',
            description:
              'The page still contains placeholder or draft markers such as lorem ipsum, TODO, or TBD.',
            suggestion:
              'Replace placeholder copy with production-ready content before publishing.',
            reasoning:
              'Placeholder terms are a strong signal that the content is incomplete or no longer valid.',
            page_path: source.reference,
            component_path: null,
          },
          source,
        ),
      );
    }

    if (source.text.length > 0 && source.text.length < 180) {
      issues.push(
        issue(
          {
            issue_type: 'incoherent-content',
            severity: 'info',
            status: 'open',
            title: 'Very short page copy',
            description:
              'The visible text content is extremely short, which can make the page feel incomplete or unclear.',
            suggestion:
              'Review whether the page needs more explanatory copy, context, or supporting details.',
            reasoning:
              'Pages with very little visible text often lack context, clarity, or complete information.',
            page_path: source.reference,
            component_path: null,
          },
          source,
        ),
      );
    }
  }

  if (agent.key === 'broken-link') {
    // Broken-link agent is a pure crawler — skip to dedicated implementation
  }

  if (agent.key === 'accessibility' || agent.key === 'compliance') {
    if (!/privacy|terms|accessibility/i.test(lowerText)) {
      issues.push(
        issue(
          {
            issue_type: 'incorrect-content',
            severity: 'info',
            status: 'open',
            title: 'No obvious compliance or accessibility references found',
            description:
              'The page content does not mention privacy, terms, or accessibility context.',
            suggestion:
              'Check whether the page should expose legal, consent, or accessibility guidance.',
            reasoning:
              'Certain pages need accessible and compliant supporting content, especially around regulated or user-sensitive journeys.',
            page_path: source.reference,
            component_path: null,
          },
          source,
        ),
      );
    }
  }

  return {
    summary: `${issues.length} issue${issues.length === 1 ? '' : 's'} found by fallback analysis for ${agent.name}.`,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Broken-link crawler
// ---------------------------------------------------------------------------

const SKIPPED_SCHEMES = /^(mailto:|tel:|javascript:|data:|#)/i;

/**
 * A link found in the HTML of a page, enriched with its context.
 */
type LinkRef = {
  /** Resolved absolute URL (hash stripped). */
  url: string;
  /** The nearest ancestor custom-element (web-component) tag name, e.g.
   *  "my-card" or "wc-hero-banner", or null when the link is not inside a
   *  web component. */
  ancestorComponent: string | null;
};

/**
 * Walk backwards through `html` from `matchIndex` looking for the nearest
 * opening tag of a custom element (tag name containing a hyphen).
 * Returns the tag name lowercased, or null.
 */
function findAncestorWebComponent(
  html: string,
  matchIndex: number,
): string | null {
  // Scan backwards for opening tags: <tag-name ...>
  // We look for the nearest *opening* tag that has a hyphen in its name.
  const fragment = html.slice(0, matchIndex);
  // Match all opening tags with a hyphen in the name (= custom elements)
  // We use lastIndex by iterating forward and keeping the last match found
  // before matchIndex.
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
  const seen = new Map<string, LinkRef>(); // keyed by resolved url

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
      // Unparseable href — skip
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
      // HEAD not allowed — retry with GET
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 10_000);
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'EtherealNexus-ContentAdvisor/1.0 (+https://ethereal-nexus.com)',
        },
      });
      clearTimeout(getTimeout);
      return {
        url,
        status: getResponse.status,
        ok: getResponse.ok,
      };
    }
    return { url, status: response.status, ok: response.ok };
  } catch {
    clearTimeout(timeout);
    return { url, status: 0, ok: false };
  }
}

/**
 * Normalises a user-supplied domain value into a plain origin string
 * (e.g. "https://example.com") that can be used as a URL prefix filter.
 *
 * Accepts:
 *   - Full origins:   "https://example.com"  → "https://example.com"
 *   - Bare hostnames: "example.com"           → "https://example.com"
 */
function normaliseAllowedDomain(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    // Strip any trailing path/slash so we match on origin only
    try {
      const { origin } = new URL(trimmed);
      return origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  }
  return `https://${trimmed.replace(/\/+$/, '')}`;
}

type BrokenLinkCrawlResult = {
  summary: string;
  issues: ContentAdvisorIssueInput[];
};

/**
 * Crawls the page at `source` up to `maxDepth` levels deep, only following
 * links within `allowedDomain`. When no `allowedDomain` is given it falls back
 * to the origin of `source.url`. Reports every link (at every level) that
 * returns a non-2xx/3xx status.
 */
export async function crawlBrokenLinks(
  source: PageAnalysisSource,
  maxDepth: number = 1,
  allowedDomain?: string | null,
): Promise<BrokenLinkCrawlResult> {
  if (!source.url.startsWith('http')) {
    return {
      summary: 'Page URL is not an absolute URL; skipping crawl.',
      issues: [],
    };
  }

  const baseOrigin = allowedDomain
    ? normaliseAllowedDomain(allowedDomain)
    : new URL(source.url).origin;
  const issues: ContentAdvisorIssueInput[] = [];

  // Queue entries: { url, depth, foundOnUrl, ancestorComponent }
  const queue: Array<{ url: string; depth: number; foundOnUrl: string; ancestorComponent: string | null }> = [];
  const visited = new Set<string>();
  const checked = new Set<string>();

  // Seed from the already-fetched source page
  const seedLinks = extractLinks(source.html, source.url).filter((link) =>
    link.url.startsWith(baseOrigin),
  );
  for (const link of seedLinks) {
    if (!visited.has(link.url)) {
      visited.add(link.url);
      queue.push({ url: link.url, depth: 1, foundOnUrl: source.url, ancestorComponent: link.ancestorComponent });
    }
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, 20); // process in batches of 20

    await Promise.all(
      batch.map(async ({ url, depth, foundOnUrl, ancestorComponent }) => {
        // Check if the link is alive
        if (!checked.has(url)) {
          checked.add(url);
          const result = await checkLink(url);

          if (!result.ok) {
            const statusLabel =
              result.status === 0
                ? 'connection error'
                : `HTTP ${result.status}`;

            // Build a stable fingerprint that uniquely identifies this
            // broken link: page it was found on + the broken URL itself.
            // Using a pre-computed fingerprint avoids collisions between
            // different broken links on the same page that share the same
            // HTTP status (and therefore the same title).
            const normalize = (v: string) =>
              v.trim().toLowerCase().replace(/\s+/g, ' ');
            const fingerprint = [
              'broken-content',
              normalize(foundOnUrl),
              normalize(ancestorComponent ?? ''),
              normalize(url),
            ].join('::');

            issues.push(
              issue(
                {
                  issue_type: 'broken-content',
                  severity:
                    result.status >= 500 || result.status === 0
                      ? 'critical'
                      : 'warning',
                  status: 'open',
                  title: `Broken link: ${statusLabel}`,
                  description: `The link "${url}" found on page "${foundOnUrl}" returned ${statusLabel}.`,
                  suggestion:
                    'Fix or remove this link. If the destination has moved, set up a redirect.',
                  reasoning: `The resource returned ${statusLabel}, making it inaccessible to users.`,
                  page_path: foundOnUrl,
                  component_path: ancestorComponent ?? null,
                  fingerprint,
                },
                source,
              ),
            );
          }

          // Only follow links within the same origin and only if within depth limit
          if (result.ok && depth < maxDepth) {
            try {
              const nextSource = await fetchPageSource(url);
              const nextLinks = extractLinks(nextSource.html, url).filter(
                (link) => link.url.startsWith(baseOrigin),
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
                }
              }
            } catch {
              // If we can't fetch the page to follow deeper links, skip silently
            }
          }
        }
      }),
    );
  }

  const issueCount = issues.length;
  return {
    summary: issueCount
      ? `Found ${issueCount} broken link${issueCount === 1 ? '' : 's'} across ${checked.size} link${checked.size === 1 ? '' : 's'} checked (depth ${maxDepth}).`
      : `No broken links found across ${checked.size} link${checked.size === 1 ? '' : 's'} checked (depth ${maxDepth}).`,
    issues,
  };
}

export async function fetchPageSource(
  pageReference: string,
): Promise<PageAnalysisSource> {
  const resolvedUrl = resolveContentAdvisorPageUrl(pageReference);

  if (!resolvedUrl.startsWith('http')) {
    return {
      reference: pageReference,
      url: resolvedUrl,
      title: null,
      text: '',
      html: '',
      status: 200,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch(resolvedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'EtherealNexus-ContentAdvisor/1.0 (+https://ethereal-nexus.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const html = response.ok ? await response.text() : '';
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || null;
    const text = stripHtml(html);

    return {
      reference: pageReference,
      url: response.url || resolvedUrl,
      title,
      text,
      html,
      status: response.status,
    };
  } catch {
    return {
      reference: pageReference,
      url: resolvedUrl,
      title: null,
      text: '',
      html: '',
      status: 0,
    };
  }
}

export async function analyzePageWithAgent(
  agent: ContentAdvisorAgentConfig,
  source: PageAnalysisSource,
): Promise<{
  summary: string;
  response: string;
  issues: ContentAdvisorIssueInput[];
}> {
  // Broken-link agent is a pure HTTP crawler — it never calls an AI provider
  if (agent.key === 'broken-link') {
    const crawlConfig = agent.provider_config as {
      crawl_depth?: number | null;
      allowed_domain?: string | null;
    } | null;
    const depth = crawlConfig?.crawl_depth ?? 1;
    const allowedDomain = crawlConfig?.allowed_domain ?? null;
    const result = await crawlBrokenLinks(source, depth, allowedDomain);
    return { ...result, response: JSON.stringify(result, null, 2) };
  }

  const fallback = fallbackAnalyzePageWithAgent(agent, source);

  const providerConfig = agent.provider_config as {
    project_endpoint?: string | null;
    agent_id?: string | null;
  };

  if (!providerConfig?.project_endpoint || !providerConfig?.agent_id) {
    logger.warn('Content Advisor agent missing provider configuration', {
      route: 'content-advisor-analysis',
      agentKey: agent.key,
      configuredAgentName: agent.name,
      configuredAgentId: agent.id,
      providerAgentId: providerConfig?.agent_id || null,
      pageReference: source.reference,
      hasProjectEndpoint: Boolean(providerConfig?.project_endpoint),
      hasAgentId: Boolean(providerConfig?.agent_id),
    });
    return { ...fallback, response: JSON.stringify(fallback, null, 2) };
  }

  try {
    const prompt = buildAgentPrompt(agent, source);

    logger.info('Sending Content Advisor request to agent', {
      route: 'content-advisor-analysis',
      agentKey: agent.key,
      configuredAgentName: agent.name,
      configuredAgentId: agent.id,
      providerAgentId: providerConfig.agent_id,
      pageReference: source.reference,
      resolvedPageUrl: source.url,
      projectEndpoint: providerConfig.project_endpoint,
      promptLength: prompt.length,
    });
    logger.debug('Content Advisor prompt payload', {
      route: 'content-advisor-analysis',
      agentKey: agent.key,
      configuredAgentName: agent.name,
      configuredAgentId: agent.id,
      providerAgentId: providerConfig.agent_id,
      pageReference: source.reference,
      prompt,
    });

    const response = await callFoundryChat({
      providerConfig: agent.provider_config,
      messages: [{ role: 'user', content: prompt }],
      loggerContext: {
        route: 'content-advisor-analysis',
        agentKey: agent.key,
        configuredAgentName: agent.name,
        configuredAgentId: agent.id,
        providerAgentId: providerConfig.agent_id,
        pageReference: source.reference,
        pageUrl: source.url,
      },
    });

    logger.info('Received Content Advisor agent response', {
      route: 'content-advisor-analysis',
      agentKey: agent.key,
      configuredAgentName: agent.name,
      configuredAgentId: agent.id,
      providerAgentId: providerConfig.agent_id,
      pageReference: source.reference,
      responseLength: response.reply.length,
      conversationId: response.conversationId,
    });
    logger.debug('Content Advisor raw response payload', {
      route: 'content-advisor-analysis',
      agentKey: agent.key,
      configuredAgentName: agent.name,
      configuredAgentId: agent.id,
      providerAgentId: providerConfig.agent_id,
      pageReference: source.reference,
      response: response.reply,
    });

    const parsedResponse = contentAdvisorAgentResponseSchema.safeParse(
      extractJson(response.reply),
    );

    if (!parsedResponse.success) {
      logger.warn('Content Advisor agent response failed schema validation', {
        route: 'content-advisor-analysis',
        agentKey: agent.key,
        configuredAgentName: agent.name,
        configuredAgentId: agent.id,
        providerAgentId: providerConfig.agent_id,
        pageReference: source.reference,
        issuesFromFallback: fallback.issues.length,
        zodIssues: parsedResponse.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return {
        ...fallback,
        response: response.reply || JSON.stringify(fallback, null, 2),
      };
    }

    const issues = parsedResponse.data.issues.map((candidate) =>
      contentAdvisorIssueInputSchema.parse({
        page_url: source.url,
        page_path: source.reference,
        component_path: (candidate as { component_path?: string | null })
          .component_path,
        page_title: source.title || null,
        issue_type: candidate.issue_type,
        severity: candidate.severity,
        status: candidate.status || 'open',
        title: candidate.title,
        description: candidate.description,
        suggestion: candidate.suggestion,
        reasoning: candidate.reasoning,
      }),
    );

    return {
      summary:
        parsedResponse.data.summary ||
        `${issues.length} issue${issues.length === 1 ? '' : 's'} found by ${agent.name}.`,
      response: response.reply,
      issues,
    };
  } catch (error) {
    logger.error('Content Advisor agent call failed', error as Error, {
      route: 'content-advisor-analysis',
      agentKey: agent.key,
      configuredAgentName: agent.name,
      configuredAgentId: agent.id,
      providerAgentId: providerConfig.agent_id,
      pageReference: source.reference,
      resolvedPageUrl: source.url,
    });
    return { ...fallback, response: JSON.stringify(fallback, null, 2) };
  }
}
