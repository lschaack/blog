import { useCallback, useState, ChangeEventHandler, useId } from "react";
import fuzzysort from "fuzzysort";
import debounce from "lodash/debounce";
import { Search } from "lucide-react";
import clsx from "clsx";

import { InputText } from "./InputText";

type FuzzySearchInputProps = {
  value: string,
  onChange: (value: string) => void,
  items: string[];
  onFilterItems: (filtered: ReadonlyArray<string>) => void;
  placeholder?: string;
  className?: string;
};

function FuzzySearchInput({
  value,
  onChange,
  items,
  onFilterItems: onResults,
  placeholder,
  className,
}: FuzzySearchInputProps) {
  const inputId = useId();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateResults = useCallback(debounce((query: string) => {
    const fuzzyResults = fuzzysort
      .go(query, items, { limit: 10 })
      .map(result => result.target);

    onResults(fuzzyResults);
  }, 50), []);

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(e => {
    const query = e.target.value;

    // NOTE: default to showing all items for empty query
    if (!query) {
      onResults(items);
    } else {
      updateResults(query);
    }

    onChange(query);
  }, [updateResults, onChange, items, onResults]);

  return (
    <div className={clsx("p-2 flex gap-2", className)}>
      <Search size={24} />
      <InputText
        label="Search for a tag"
        hideLabel
        id={`fuzzy-search-${inputId}`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-0"
      />
    </div>
  );
}

type FuzzySearchResultsProps = {
  items: ReadonlyArray<string>;
  query: string;
  onSelect: (item: string) => void;
  onCreate?: () => void;
}
function FuzzySearchResults({ items, query, onSelect, onCreate }: FuzzySearchResultsProps) {
  return (
    <div className="flex flex-col items-stretch">
      {items.length === 0 ? (
        <>
          <div className="menu-option single-row">
            No results found.
          </div>
          {onCreate && (
            <button onClick={onCreate}>
              Create new tag &quot;{query}&quot;
            </button>
          )}
        </>
      ) : (
        items.map((item, index) => (
          <button
            key={`fuzzy-result-${item}-${index}`}
            className="menu-option single-row text-left"
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))
      )}
    </div>
  )
}

type FuzzySearchProps = {
  value: string;
  onChange: (value: string) => void;
  items: string[];
  onSelect: (item: string) => void;
  onCreate?: (query: string) => void;
};
export function FuzzySearch({
  value,
  onChange,
  items,
  onSelect,
  onCreate, // TODO:
}: FuzzySearchProps) {
  const [filteredItems, setFilteredItems] = useState<ReadonlyArray<string>>(items);

  return (
    <div className="bg-deep-100 rounded-lg border-2 border-deep-600 overflow-hidden">
      <FuzzySearchInput
        value={value}
        onChange={onChange}
        items={items}
        onFilterItems={setFilteredItems}
        className="border-b-2 border-deep-300"
      />

      <FuzzySearchResults
        items={value ? filteredItems : items}
        query={value}
        onSelect={onSelect}
        onCreate={() => onCreate?.(value)}
      />
    </div>
  );
}
