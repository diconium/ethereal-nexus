import React, { useRef, useEffect, useCallback } from 'react';

import type { SearchState, SuggestionState, SearchResultItem } from './useSearchWidget';
import { SearchIcon, CloseIcon, ClearIcon, FileIcon, GlobeIcon, Spinner } from './SearchWidgetIcons';
import { classifyLink, getDomain, extBadge, stripHtml } from './searchWidgetHelpers';

// ---------------------------------------------------------------------------
// Props contract
// Everything the view needs is passed in — zero fetch/state logic here.
// ---------------------------------------------------------------------------

export type SearchWidgetViewProps = {
  isOpen: boolean;
  query: string;
  searchState: SearchState;
  suggestionState: SuggestionState;
  placeholder?: string;
  onOpen: () => void;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSearch: (query: string) => void;
  onSuggestionSelect: (suggestion: string) => void;
};

// ---------------------------------------------------------------------------
// ResultCard — pure presentational sub-component
// ---------------------------------------------------------------------------

function ResultCard({ result }: { result: SearchResultItem }) {
  const kind = classifyLink(result.link);
  const title = result.title || result.id || 'Untitled';
  const snippet = result.snippet ? stripHtml(result.snippet) : '';

  return (
    <div className="sw__result">
      <div className="sw__dot" />
      <div className="sw__resultBody">
        {kind === 'web' ? (
          <a
            href={result.link!}
            target="_blank"
            rel="noopener noreferrer"
            className="sw__resultTitle"
          >
            {title}
          </a>
        ) : (
          <span className="sw__resultTitle">{title}</span>
        )}

        {result.link && (
          <div className="sw__resultSource">
            {kind === 'web' ? (
              <>
                <GlobeIcon />
                <span>{getDomain(result.link)}</span>
              </>
            ) : result.gcsUri ? (
              <>
                <FileIcon />
                <span className="sw__resultSourceMono">{result.gcsUri}</span>
                <span className="sw__badge">{extBadge(result.gcsUri)}</span>
              </>
            ) : null}
          </div>
        )}

        {snippet && <p className="sw__snippet">{snippet}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchWidgetView — layout + event wiring, no data fetching
// ---------------------------------------------------------------------------

export function SearchWidgetView({
  isOpen,
  query,
  searchState,
  suggestionState,
  placeholder = 'Click here to perform your search',
  onOpen,
  onClose,
  onQueryChange,
  onSearch,
  onSuggestionSelect,
}: SearchWidgetViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when the search bar opens
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  // Escape key closes the search bar
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) onSearch(query);
    },
    [query, onSearch],
  );

  const isLoading = searchState.status === 'loading';
  const showSuggestions =
    suggestionState.status === 'ready' &&
    suggestionState.suggestions.length > 0 &&
    searchState.status === 'idle';

  return (
    <div className="sw">
      {/* ── Closed: bare trigger icon ── */}
      {!isOpen && (
        <button
          className="sw__trigger"
          onClick={onOpen}
          type="button"
          aria-label="Open search"
        >
          <SearchIcon size={22} />
        </button>
      )}

      {/* ── Open: inline search bar + results ── */}
      {isOpen && (
        <div className="sw__expanded">
          {/* Search bar row */}
          <form className="sw__row" onSubmit={handleSubmit} noValidate>
            <span className="sw__label">Search</span>

            <div className="sw__inputWrap">
              <input
                ref={inputRef}
                className="sw__input"
                type="search"
                autoComplete="off"
                placeholder={placeholder}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                aria-label="Search"
              />
              {query && (
                <button
                  type="button"
                  className="sw__clear"
                  onClick={() => onQueryChange('')}
                  aria-label="Clear"
                >
                  <ClearIcon size={16} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="sw__searchBtn"
              disabled={!query.trim() || isLoading}
            >
              {isLoading ? <Spinner size={16} /> : 'Search'}
            </button>

            <button
              type="button"
              className="sw__close"
              onClick={onClose}
              aria-label="Close search"
            >
              <CloseIcon size={22} />
            </button>
          </form>

          {/* Autocomplete suggestions */}
          {showSuggestions && (
            <ul className="sw__suggestions" role="listbox">
              {suggestionState.suggestions.map((s) => (
                <li
                  key={s}
                  role="option"
                  className="sw__suggestion"
                  onMouseDown={(e) => { e.preventDefault(); onSuggestionSelect(s); }}
                >
                  <span className="sw__suggIcon"><SearchIcon size={13} /></span>
                  {s}
                </li>
              ))}
            </ul>
          )}

          {/* Results / states */}
          <div className="sw__results">
            {searchState.status === 'error' && (
              <div className="sw__error">{searchState.message}</div>
            )}

            {searchState.status === 'success' && (
              <>
                <p className="sw__meta">
                  {searchState.data.totalSize > 0
                    ? `${searchState.data.totalSize.toLocaleString()} result${searchState.data.totalSize !== 1 ? 's' : ''}`
                    : `No results for "${searchState.data.query}"`}
                </p>
                {searchState.data.results.map((r, i) => (
                  <ResultCard key={r.id || i} result={r} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
