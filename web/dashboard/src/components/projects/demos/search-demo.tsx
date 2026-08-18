'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  ChevronDown,
  Globe,
} from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'isomorphic-dompurify';
import { Badge } from '@/components/ui/badge';
import type { SearchApp, SearchAppApiSettings } from '@/data/ai/dto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchResultItem = {
  id: string;
  title: string;
  snippet: string;
  link: string | null;
  category: string | null;
};

export type SearchSummaryReference = {
  index: number;
  title: string;
  link: string | null;
};

export type SearchApiResponse = {
  results: SearchResultItem[];
  totalSize: number;
  summary: { text: string; references: SearchSummaryReference[] } | null;
  query: string;
  pageSize: number;
};

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; data: SearchApiResponse }
  | { status: 'error'; message: string };

export type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; text: string; references: SearchSummaryReference[] }
  | { status: 'unavailable' };

export type RateLimitState = {
  requestWindow: {
    enabled: boolean;
    identities: Array<{
      source: string;
      current: number;
      remaining: number;
      resetSeconds: number;
      limit: number;
    }>;
  };
  sessionCap: {
    enabled: boolean;
    current: number;
    remaining: number;
    limit: number;
  };
  temporaryBlock: {
    enabled: boolean;
    identities: Array<{ source: string; blocked: boolean }>;
  };
  allowedOrigins: { configured: boolean; count: number };
} | null;

// ---------------------------------------------------------------------------
// API layer
// ---------------------------------------------------------------------------

/**
 * Creates a search adapter that POSTs queries to the Ethereal Nexus search API.
 *
 * @example
 * const adapter = createSearchHttpAdapter('/public/my-search-app');
 * const result = await adapter.search('my query', { pageSize: 10 });
 */
export function createSearchHttpAdapter(endpoint: string) {
  async function doSearch(
    query: string,
    options?: { pageSize?: number; includeSummary?: boolean },
  ): Promise<SearchApiResponse> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize: options?.pageSize,
        includeSummary: options?.includeSummary ?? false,
      }),
    });

    if (!res.ok) {
      let errorMessage = `Search failed (${res.status})`;
      try {
        const json = await res.json();
        if (json?.error) errorMessage = json.error;
      } catch {
        /* ignore */
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const limitType = res.headers.get('X-Ethereal-Limit-Type');
        if (limitType === 'session-cap')
          throw new Error(
            'Session search limit reached. Please try again later.',
          );
        const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : null;
        throw new Error(
          waitSeconds
            ? `Too many requests. Please wait ${formatWaitTime(waitSeconds)} before trying again.`
            : 'Too many requests. Please try again later.',
        );
      }
      throw new Error(errorMessage);
    }
    return res.json() as Promise<SearchApiResponse>;
  }

  return {
    search: (query: string, options?: { pageSize?: number }) =>
      doSearch(query, { ...options, includeSummary: true }),

    async fetchLimits(limitsEndpoint: string): Promise<RateLimitState> {
      try {
        const res = await fetch(limitsEndpoint, { method: 'GET' });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// useSearchAdapter hook
// ---------------------------------------------------------------------------

export function useSearchAdapter(endpoint: string) {
  const [searchState, setSearchState] = useState<SearchState>({
    status: 'idle',
  });
  const [summaryState, setSummaryState] = useState<SummaryState>({
    status: 'idle',
  });
  const [rateLimits, setRateLimits] = useState<RateLimitState>(null);
  const adapterRef = useRef(createSearchHttpAdapter(endpoint));
  // Track the current search generation so stale responses are discarded.
  const generationRef = useRef(0);

  useEffect(() => {
    adapterRef.current = createSearchHttpAdapter(endpoint);
  }, [endpoint]);

  const fetchLimits = useCallback(async () => {
    const limits = await adapterRef.current.fetchLimits(
      endpoint.replace(/\/$/, '') + '/limits',
    );
    setRateLimits(limits);
  }, [endpoint]);

  const search = useCallback(
    async (query: string, pageSize?: number) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      // Bump generation so any in-flight response from a previous query is ignored.
      const generation = ++generationRef.current;

      setSearchState({ status: 'loading', query: trimmed });
      setSummaryState({ status: 'idle' });

      try {
        const data = await adapterRef.current.search(trimmed, { pageSize });
        if (generationRef.current !== generation) return;

        setSearchState({ status: 'success', data });
        setSummaryState(
          data.summary?.text
            ? {
                status: 'success',
                text: data.summary.text,
                references: data.summary.references ?? [],
              }
            : { status: 'unavailable' },
        );
        void fetchLimits();
      } catch (error) {
        if (generationRef.current !== generation) return;
        setSearchState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred.',
        });
      }
    },
    [fetchLimits],
  );

  const reset = useCallback(() => {
    generationRef.current += 1;
    setSearchState({ status: 'idle' });
    setSummaryState({ status: 'idle' });
  }, []);

  return { searchState, summaryState, rateLimits, search, reset, fetchLimits };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LinkKind = 'web' | 'gcs' | 'other' | 'none';

/** Converts a duration in seconds to a human-readable string, e.g. "27 min" or "45 sec". */
function formatWaitTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.ceil(seconds / 3600);
    return `${h} hour${h !== 1 ? 's' : ''}`;
  }
  if (seconds >= 60) {
    const m = Math.ceil(seconds / 60);
    return `${m} minute${m !== 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/** True when the error message originated from a 429 rate-limit or temporary block. */
function isRateLimitError(message: string): boolean {
  return /too many requests|rate limit|session.*limit|temporarily blocked/i.test(
    message,
  );
}

function classifyLink(link: string | null): LinkKind {
  if (!link) return 'none';
  if (link.startsWith('https://') || link.startsWith('http://')) return 'web';
  if (link.startsWith('gs://')) return 'gcs';
  return 'other';
}

function formatWebDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getCategory(result: SearchResultItem): string {
  const { link, category } = result;
  if (category) return category;
  if (link?.startsWith('https://') || link?.startsWith('http://')) {
    return formatWebDomain(link);
  }
  return '';
}

// ---------------------------------------------------------------------------
// Typewriter hook
// ---------------------------------------------------------------------------

/**
 * Reveals `fullText` paragraph-by-paragraph.
 *
 * - The first paragraph appears immediately when `active` becomes true.
 * - Each subsequent paragraph fades in after `delayMs` milliseconds.
 * - Within each paragraph, words stream in at `wordsPerSecond` so the text
 *   still feels "alive" rather than just popping in as a block.
 * - Returns the visible text slice and a `done` flag.
 */
function useTypewriter(
  fullText: string,
  {
    active = true,
    wordsPerSecond = 40,
    paragraphDelayMs = 400,
  }: {
    active?: boolean;
    wordsPerSecond?: number;
    paragraphDelayMs?: number;
  } = {},
) {
  // Split on blank lines while keeping the delimiters so we can rejoin exactly
  const paragraphs = useMemo(() => fullText.split(/(\n\n+)/), [fullText]);

  // How many paragraphs (and delimiters) are currently unlocked
  const [unlockedCount, setUnlockedCount] = useState(0);
  // Word index within the currently streaming paragraph
  const [wordIndex, setWordIndex] = useState(0);

  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const msPerWord = 1000 / wordsPerSecond;

  // Reset whenever source text changes or typewriter is toggled off
  useEffect(() => {
    setUnlockedCount(0);
    setWordIndex(0);
    lastTimeRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, [fullText, active]);

  // Unlock the first paragraph immediately on activate
  useEffect(() => {
    if (!active || unlockedCount > 0) return;
    setUnlockedCount(1);
  }, [active, unlockedCount]);

  // Stream words within the current paragraph
  useEffect(() => {
    if (!active || unlockedCount === 0) return;

    const currentParagraph = paragraphs[unlockedCount - 1] ?? '';
    const words = currentParagraph.split(/(\s+)/);

    if (wordIndex >= words.length) {
      // Current paragraph done — schedule next paragraph unlock
      if (unlockedCount < paragraphs.length) {
        timerRef.current = setTimeout(() => {
          setUnlockedCount((c) => c + 1);
          setWordIndex(0);
          lastTimeRef.current = null;
        }, paragraphDelayMs);
      }
      return;
    }

    function tick(timestamp: number) {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      const toAdd = Math.floor(elapsed / msPerWord);
      if (toAdd > 0) {
        lastTimeRef.current = timestamp - (elapsed % msPerWord);
        setWordIndex((prev) => Math.min(prev + toAdd, words.length));
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [
    active,
    unlockedCount,
    wordIndex,
    paragraphs,
    msPerWord,
    paragraphDelayMs,
  ]);

  const currentParagraph = paragraphs[unlockedCount - 1] ?? '';
  const currentWords = currentParagraph.split(/(\s+)/);
  const streamingParagraph = currentWords.slice(0, wordIndex).join('');

  const done =
    unlockedCount >= paragraphs.length && wordIndex >= currentWords.length;

  const visible =
    paragraphs.slice(0, Math.max(0, unlockedCount - 1)).join('') +
    streamingParagraph;

  return { visible, done };
}

// ---------------------------------------------------------------------------
// DOMPurify configs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// react-markdown link safety
// ---------------------------------------------------------------------------

/**
 * Passed as the `urlTransform` prop to ReactMarkdown.
 *
 * react-markdown converts markdown links like [x](javascript:alert(1)) into
 * <a href="javascript:..."> AFTER DOMPurify has already run on the source
 * string (DOMPurify only sanitises HTML, not markdown syntax).  This hook
 * runs on every URL that react-markdown is about to emit and returns `null`
 * for anything that isn't http/https/mailto, which causes react-markdown to
 * drop the href entirely rather than render a dangerous link.
 */
function safeUrlTransform(url: string): string | null {
  if (/^https?:\/\//i.test(url)) return url;
  if (/^mailto:/i.test(url)) return url;
  // Relative URLs (no protocol) are safe — no colon before the first slash
  if (/^[^:]*$/.test(url) || url.startsWith('/') || url.startsWith('#'))
    return url;
  return null; // reject javascript:, vbscript:, data:, etc.
}

/** Components override: every <a> rendered by react-markdown gets safe attributes. */
const MARKDOWN_COMPONENTS: Components = {
  a({ href, children, ...props }) {
    return (
      <a {...props} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};
// This prevents XSS via event handlers like <b onmouseover="..."> while still
// rendering Discovery Engine's <b>matched term</b> highlights.
const SNIPPET_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'em', 'strong'],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
};

function SnippetHtml({ html }: { html: string }) {
  // useMemo so we only sanitize when the HTML string changes, not every render
  const sanitized = useMemo(
    () => DOMPurify.sanitize(html, SNIPPET_PURIFY_CONFIG) as string,
    [html],
  );
  return (
    <span
      className="[&_b]:bg-yellow-100 [&_b]:text-yellow-900 [&_b]:font-medium [&_b]:rounded-sm [&_b]:px-0.5 dark:[&_b]:bg-yellow-900/40 dark:[&_b]:text-yellow-200"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={`h-3 rounded-full bg-muted animate-pulse ${className ?? 'w-full'}`}
    />
  );
}

/** Extract the first sentence from the summary text (stripped of markdown). */
function firstSentence(text: string): string {
  // Strip markdown bold/bullets, sanitize all HTML (including partial/malformed
  // tags that a regex like /<[^>]+>/g would miss), then grab up to the first
  // sentence-ending punctuation.
  const plain = DOMPurify.sanitize(
    text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^[*-]\s+/gm, ''),
    { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true },
  ).trim();
  const match = plain.match(/^.+?[.!?](?:\s|$)/);
  return match
    ? match[0].trim()
    : plain.slice(0, 120) + (plain.length > 120 ? '…' : '');
}

function SummaryPanel({ state }: { state: SummaryState }) {
  const [expanded, setExpanded] = useState(false);

  // Reset to collapsed when a new summary arrives
  useEffect(() => {
    if (state.status === 'success') setExpanded(false);
  }, [state.status]);

  const fullText =
    state.status === 'success' ? preprocessSummaryText(state.text) : '';

  // Typewriter only active when the user has opened the full answer
  const { visible: typedText, done: typingDone } = useTypewriter(fullText, {
    active: expanded && state.status === 'success',
    wordsPerSecond: 40,
    paragraphDelayMs: 350,
  });

  if (state.status === 'idle' || state.status === 'unavailable') return null;

  return (
    <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-2">
      {/* Header — always visible, acts as toggle when text is ready */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => state.status === 'success' && setExpanded((v) => !v)}
        disabled={state.status === 'loading'}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1">
          Generated answer
        </p>
        {state.status === 'loading' && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
        {state.status === 'success' && (
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Skeleton while loading */}
      {state.status === 'loading' && (
        <div className="space-y-2">
          <SkeletonLine />
          <SkeletonLine className="w-5/6" />
          <SkeletonLine className="w-4/6" />
        </div>
      )}

      {/* Collapsed preview — first sentence only */}
      {state.status === 'success' && !expanded && (
        <p
          className="text-sm text-muted-foreground line-clamp-2 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          {firstSentence(state.text)}
        </p>
      )}

      {/* Expanded — typewriter reveal + sources */}
      {state.status === 'success' && expanded && (
        <>
          <div
            className="prose prose-sm dark:prose-invert max-w-none
            prose-p:my-1 prose-ul:my-1.5 prose-li:my-0.5
            prose-strong:text-foreground prose-headings:text-foreground
            [&_sup.cite]:inline-flex [&_sup.cite]:items-center [&_sup.cite]:justify-center
            [&_sup.cite]:rounded [&_sup.cite]:bg-primary/10 [&_sup.cite]:px-1
            [&_sup.cite]:text-[9px] [&_sup.cite]:font-bold [&_sup.cite]:text-primary
            [&_sup.cite]:leading-4 [&_sup.cite]:mx-0.5 [&_a]:text-primary"
          >
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              urlTransform={safeUrlTransform}
              components={MARKDOWN_COMPONENTS}
            >
              {/* Append a blinking cursor character while typing */}
              {typingDone ? typedText : typedText + '▍'}
            </ReactMarkdown>
          </div>

          {/* Sources — only shown once typing is complete to avoid layout jump */}
          {typingDone && state.references.length > 0 && (
            <div className="pt-1 border-t space-y-1.5 animate-in fade-in duration-300">
              <p className="text-xs font-medium text-muted-foreground">
                Sources
              </p>
              <div className="flex flex-wrap gap-1.5">
                {state.references.map((ref) => {
                  const isClickable = ref.link?.startsWith('http');
                  const chip = (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-primary">
                        [{ref.index}]
                      </span>
                      <span className="truncate max-w-[200px]">
                        {ref.title}
                      </span>
                    </span>
                  );
                  return isClickable ? (
                    <a
                      key={ref.index}
                      href={ref.link ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors no-underline"
                    >
                      {chip}
                    </a>
                  ) : (
                    <span
                      key={ref.index}
                      className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
                      title={ref.link || undefined}
                    >
                      {chip}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// DOMPurify config for the generated answer.
// Allows <sup class="cite"> (injected by preprocessSummaryText) and the
// standard prose tags that react-markdown produces, but strips everything else.
// This config is applied BEFORE the content reaches ReactMarkdown+rehype-raw,
// so any injected HTML from the Discovery Engine API is neutralised first.
const SUMMARY_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['sup', 'b', 'em', 'strong', 'p', 'ul', 'ol', 'li', 'br'],
  ALLOWED_ATTR: ['class'],
  KEEP_CONTENT: true,
  FORCE_BODY: false,
};

/**
 * Sanitizes the summary markdown text with DOMPurify, then converts [N]
 * citation markers into `<sup class="cite">N</sup>` HTML nodes.
 *
 * The result is passed to ReactMarkdown with the `rehype-raw` plugin, which
 * tells the rehype AST pipeline to parse and render those inline HTML nodes
 * instead of escaping them as text (the default react-markdown behaviour).
 *
 * Security: DOMPurify runs first so no attacker-controlled HTML from the
 * Discovery Engine API can reach rehype-raw.
 */
function preprocessSummaryText(text: string): string {
  // 1. Sanitize the raw summary — strips any HTML the API might have injected
  const clean = DOMPurify.sanitize(text, SUMMARY_PURIFY_CONFIG) as string;
  // 2. Convert [N] citation markers to safe <sup> HTML nodes
  return clean.replace(/\[(\d+)\]/g, (_, n) => `<sup class="cite">${n}</sup>`);
}

// ---------------------------------------------------------------------------
// Result row
// ---------------------------------------------------------------------------

function SearchResultRow({ result }: { result: SearchResultItem }) {
  const category = getCategory(result);
  const title = result.title || result.id || 'Untitled';
  const isWebLink = result.link?.startsWith('http') ?? false;

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0 hover:bg-transparent">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      <div className="flex-1 min-w-0 space-y-0.5">
        {/* Title */}
        <div className="flex items-baseline gap-2 flex-wrap">
          {isWebLink ? (
            <a
              href={result.link ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sm text-foreground hover:text-primary leading-snug"
            >
              <SnippetHtml html={title} />
            </a>
          ) : (
            <span className="font-medium text-sm text-foreground leading-snug">
              <SnippetHtml html={title} />
            </span>
          )}
          {category && (
            <span className="text-xs text-muted-foreground shrink-0">
              {category}
            </span>
          )}
        </div>

        {/* Source line */}
        <div className="flex items-center gap-2 min-w-0">
          {isWebLink && (
            <div className="flex items-center gap-1 min-w-0">
              <Globe className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground/70 truncate">
                {formatWebDomain(result.link ?? '')}
              </span>
            </div>
          )}
        </div>

        {/* Snippet */}
        {result.snippet && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            <SnippetHtml html={result.snippet} />
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate limit badge
// ---------------------------------------------------------------------------

function RateLimitBadge({ limits }: { limits: RateLimitState }) {
  if (!limits) return null;
  const isBlocked = limits.temporaryBlock?.identities?.some((id) => id.blocked);
  if (isBlocked) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1 text-xs">
        <Shield className="h-3 w-3" />
        Blocked
      </Badge>
    );
  }
  const wi = limits.requestWindow?.identities?.[0];
  if (!limits.requestWindow?.enabled || !wi) return null;
  const pct = wi.remaining / wi.limit;
  return (
    <span
      className={`text-xs ${
        pct < 0.2
          ? 'text-red-500'
          : pct < 0.5
            ? 'text-yellow-600'
            : 'text-muted-foreground'
      }`}
    >
      {wi.remaining}/{wi.limit}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SearchDemo
// ---------------------------------------------------------------------------

type SearchDemoProps = {
  searchApp: SearchApp;
  apiSettings: SearchAppApiSettings;
};

export function SearchDemo({ searchApp, apiSettings }: SearchDemoProps) {
  const endpoint = `/public/${searchApp.public_slug}`;
  const { searchState, summaryState, rateLimits, search, fetchLimits } =
    useSearchAdapter(endpoint);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchLimits();
  }, [fetchLimits]);

  // Debounced autocomplete — triggers on every query change
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${endpoint}/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: string[] };
        const list = (data.suggestions ?? []).slice(0, 8);
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
        setActiveSuggestion(-1);
      } catch {
        // aborted or network error — silently ignore
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, endpoint]);

  const commitSearch = useCallback(
    (value: string) => {
      setShowSuggestions(false);
      setSuggestions([]);
      setActiveSuggestion(-1);
      setQuery(value);
      search(value, searchApp.page_size);
    },
    [search, searchApp.page_size],
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) commitSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      commitSearch(suggestions[activeSuggestion]);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const isLoading = searchState.status === 'loading';
  const isBlocked = Boolean(
    rateLimits?.temporaryBlock?.identities?.some((id) => id.blocked),
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-3 p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{searchApp.name}</h2>
        <RateLimitBadge limits={rateLimits} />
      </div>

      {/* Search bar + autocomplete dropdown */}
      <div className="relative">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 h-10 focus-within:ring-1 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              placeholder="Search…"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              disabled={isLoading || isBlocked}
              autoFocus
              autoComplete="off"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            )}
            {!isLoading && query && (
              <button
                type="button"
                onClick={handleClear}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </form>

        {/* Autocomplete suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-background shadow-md overflow-hidden">
            {suggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused
                  commitSearch(suggestion);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === activeSuggestion
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result count */}
      {searchState.status === 'success' && (
        <p className="text-xs text-muted-foreground">
          {searchState.data.totalSize === 0
            ? 'No results'
            : `${searchState.data.totalSize.toLocaleString()} result${searchState.data.totalSize === 1 ? '' : 's'}`}
        </p>
      )}

      {searchState.status === 'idle' && null}

      {/* Error — distinguish rate-limit/block from other errors */}
      {searchState.status === 'error' &&
        (isRateLimitError(searchState.message) ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Search temporarily unavailable
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {searchState.message}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Search failed
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {searchState.message}
              </p>
            </div>
          </div>
        ))}

      {/* Results + summary */}
      {(searchState.status === 'success' ||
        searchState.status === 'loading') && (
        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          {/* Generated answer — skeleton while loading, text when ready */}
          <SummaryPanel state={summaryState} />

          {/* Result rows — rendered immediately when results arrive */}
          {searchState.status === 'success' &&
            (searchState.data.results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No results for &ldquo;{searchState.data.query}&rdquo;.
              </p>
            ) : (
              <div className="rounded-lg border px-4">
                {searchState.data.results.map((result, i) => (
                  <SearchResultRow key={result.id || i} result={result} />
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
