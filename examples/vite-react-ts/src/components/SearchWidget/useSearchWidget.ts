import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchResultItem = {
  id: string;
  title: string;
  snippet: string;
  link: string | null;
  gcsUri: string | null;
  document: Record<string, unknown>;
};

export type SearchResponse = {
  results: SearchResultItem[];
  totalSize: number;
  query: string;
};

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; data: SearchResponse }
  | { status: 'error'; message: string };

export type SuggestionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; suggestions: string[] };

// ---------------------------------------------------------------------------
// Search API
// ---------------------------------------------------------------------------

async function fetchSearchResults(
  apiUrl: string,
  query: string,
  pageSize = 10,
): Promise<SearchResponse> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize }),
  });

  if (!res.ok) {
    let message = `Search failed (${res.status})`;
    try {
      const json = await res.json();
      if (json?.error) message = json.error;
    } catch { /* ignore */ }

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : null;
      const waitStr = waitSec
        ? waitSec >= 60
          ? `${Math.ceil(waitSec / 60)} minute${Math.ceil(waitSec / 60) !== 1 ? 's' : ''}`
          : `${waitSec}s`
        : null;
      throw new Error(
        waitStr
          ? `Too many requests. Please wait ${waitStr} before trying again.`
          : 'Too many requests. Please try again later.',
      );
    }

    throw new Error(message);
  }

  return res.json() as Promise<SearchResponse>;
}

async function fetchSuggestions(
  apiUrl: string,
  query: string,
  signal: AbortSignal,
): Promise<string[]> {
    // Derive the suggest URL from the public search URL:
    // …/public/{slug} → …/public/{slug}/suggest
  const suggestUrl = apiUrl.replace(/\/$/, '') + '/suggest';
  const res = await fetch(`${suggestUrl}?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    signal,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.suggestions ?? []).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Hook: useSearchWidget
// ---------------------------------------------------------------------------

export type UseSearchWidgetOptions = {
  apiUrl: string;
  pageSize?: number;
};

export function useSearchWidget({ apiUrl, pageSize = 10 }: UseSearchWidgetOptions) {
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({ status: 'idle' });
  const [suggestionState, setSuggestionState] = useState<SuggestionState>({ status: 'idle' });

  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);

  // Debounced autocomplete — fires 200 ms after each keystroke
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSuggestionState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    suggestAbortRef.current?.abort();
    suggestAbortRef.current = controller;

    const timer = setTimeout(async () => {
      setSuggestionState({ status: 'loading' });
      try {
        const suggestions = await fetchSuggestions(apiUrl, trimmed, controller.signal);
        setSuggestionState({ status: 'ready', suggestions });
      } catch {
        setSuggestionState({ status: 'idle' });
      }
    }, 200);

    suggestTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, apiUrl]);

  const search = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      // Hide suggestions
      setSuggestionState({ status: 'idle' });
      setSearchState({ status: 'loading', query: trimmed });

      try {
        const data = await fetchSearchResults(apiUrl, trimmed, pageSize);
        setSearchState({ status: 'success', data });
      } catch (err) {
        setSearchState({
          status: 'error',
          message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        });
      }
    },
    [apiUrl, pageSize],
  );

  const reset = useCallback(() => {
    setQuery('');
    setSearchState({ status: 'idle' });
    setSuggestionState({ status: 'idle' });
  }, []);

  return {
    query,
    setQuery,
    searchState,
    suggestionState,
    search,
    reset,
  };
}
