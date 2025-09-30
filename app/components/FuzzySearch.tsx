import { useState, useMemo } from "react";
import fuzzysort from "fuzzysort";
import { InputText } from "./InputText";

type FuzzySearchProps<T> = {
  items: T[];
  searchKey: keyof T | ((item: T) => string);
  onSelect: (item: T) => void;
  onCreate?: (query: string) => void;
  placeholder?: string;
  className?: string;
};

// TODO: Enable string keys w/no config
export function FuzzySearch<T>({
  items,
  searchKey,
  onSelect,
  onCreate,
  placeholder = "Search...",
  className,
}: FuzzySearchProps<T>) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const searchFn = typeof searchKey === "function" ? searchKey : (item: T) => String(item[searchKey]);

    const fuzzyResults = fuzzysort.go(query, items, {
      key: searchFn,
      limit: 10,
    });

    return fuzzyResults.map(result => result.obj);
  }, [query, items, searchKey]);

  return (
    <div className={className}>
      <InputText
        id="fuzzy-search"
        label="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />

      {query && (
        <ol className="mt-2 space-y-1">
          {results.map((item, index) => (
            <li key={index}>
              <button
                onClick={() => onSelect(item)}
                className="w-full text-left p-2 hover:bg-gray-100 rounded border"
              >
                {typeof searchKey === "function" ? searchKey(item) : String(item[searchKey])}
              </button>
            </li>
          ))}
          {onCreate && (
            <li>
              <button
                onClick={() => onCreate(query)}
                className="w-full text-left p-2 hover:bg-blue-50 rounded border border-dashed border-blue-300 text-blue-600"
              >
                + Create new
              </button>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
