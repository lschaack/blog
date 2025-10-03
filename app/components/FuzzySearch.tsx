import { useRef, useCallback, ChangeEventHandler } from "react";
import fuzzysort from "fuzzysort";

type FuzzySearchProps<T> = {
  items: T[];
  onSearch: (filtered: T[]) => void;
  searchKey: keyof T | ((item: T) => string);
  placeholder?: string;
  className?: string;
};

export function FuzzySearchInput<T>({
  items,
  searchKey,
  onSearch,
  placeholder,
  className,
}: FuzzySearchProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(e => {
    const query = e.target.value;

    if (!query.trim()) {
      const emptyResults: T[] = [];
      onSearch(emptyResults);
      return emptyResults;
    }

    const searchFn = typeof searchKey === "function" ? searchKey : (item: T) => String(item[searchKey]);

    const fuzzyResults = fuzzysort.go(query, items, {
      key: searchFn,
      limit: 10,
    });

    const filteredItems = fuzzyResults.map(result => result.obj);

    onSearch(filteredItems);
  }, [items, onSearch, searchKey]);

  return (
    <input
      ref={inputRef}
      type="text"
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
