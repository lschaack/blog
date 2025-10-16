import { useState } from "react";
import clsx from "clsx";

import { TagPicker } from "../TagPicker";
import { Toggle } from "@/app/components/Toggle";

export type TagsInFilter = string[] | undefined;

type TagFilterProps = {
  tags: string[];
  tagsInFilter: TagsInFilter;
  onChange: (tags: TagsInFilter) => void;
  totalItems: number;
};
export function TagFilter({
  tags,
  tagsInFilter: initTagsInFilter,
  onChange,
  totalItems,
}: TagFilterProps) {
  const [tagsInFilter, setTagsInFilter] = useState(initTagsInFilter);
  const [enabled, setEnabled] = useState(tagsInFilter !== undefined);

  const handleSelect = (tagName: string) => {
    const nextTags = [...(tagsInFilter ?? []), tagName];
    setTagsInFilter(nextTags);
    onChange(nextTags);
  }

  const handleDeselect = (tagName: string) => {
    const nextTags = (tagsInFilter ?? []).filter(tag => tag !== tagName);
    setTagsInFilter(nextTags);
    onChange(nextTags);
  }

  const handleToggleEnabled = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    onChange(nextEnabled ? tagsInFilter : undefined);
  }

  return (
    <fieldset className="font-geist-mono flex flex-col gap-2">
      <legend className="text-lg font-bold">Tags</legend>
      <Toggle
        id="tag-filter-toggle"
        label="Filter by tags"
        value={enabled}
        onChange={handleToggleEnabled}
        asRow
      />
      <div className={clsx(!enabled && "saturate-50 contrast-50 brightness-200 pointer-events-none cursor-not-allowed")}>
        <TagPicker
          tags={tags}
          selectedTags={new Set(tagsInFilter)}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          hideLabel
        />
      </div>
      <p>
        Showing {totalItems} results {enabled && `with ${tagsInFilter?.length === 0 ? "no tags" : "any of the listed tags"}`}
      </p>
    </fieldset>
  );
}
