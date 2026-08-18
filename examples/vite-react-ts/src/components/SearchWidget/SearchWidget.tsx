import React, { useState } from 'react';
import {
  component,
  dialog,
  text,
  type Output,
} from '@ethereal-nexus/core';

import './SearchWidget.css';
import { SearchWidgetView } from './SearchWidgetView';
import { useSearchWidget } from './useSearchWidget';

// ---------------------------------------------------------------------------
// Dialog schema (CMS-editable props)
// ---------------------------------------------------------------------------

const dialogSchema = dialog({
  apiurl: text({
    label: 'Search API URL',
    placeholder: 'https://your-site.example/public/my-search-app',
    tooltip:
      'Public search endpoint exposed by Ethereal Nexus. ' +
       'Example: /public/{publicSlug}',
    required: true,
  }),
  placeholder: text({
    label: 'Input placeholder',
    placeholder: 'Search…',
    tooltip: 'Hint text shown inside the search input.',
    defaultValue: 'Search…',
  }),
});

const schema = component({ name: 'SearchWidget', version: '0.0.1' }, dialogSchema);

type Props = Output<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SearchWidget: React.FC<Props> = ({ apiurl, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { query, setQuery, searchState, suggestionState, search, reset } =
    useSearchWidget({ apiUrl: apiurl ?? '' });

  const handleClose = () => {
    setIsOpen(false);
    reset();
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    void search(suggestion);
  };

  return (
    <SearchWidgetView
      isOpen={isOpen}
      query={query}
      searchState={searchState}
      suggestionState={suggestionState}
      placeholder={placeholder ?? 'Search…'}
      onOpen={() => setIsOpen(true)}
      onClose={handleClose}
      onQueryChange={setQuery}
      onSearch={(q) => void search(q)}
      onSuggestionSelect={handleSuggestionSelect}
    />
  );
};
