"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

import { TagPicker } from "../TagPicker";
import { Toggle } from "@/app/components/Toggle";

type TagsInFilter = string[] | undefined;

type TagFilterHistory = {
  tagsInFilter: TagsInFilter;
  enableFilterByTag: boolean;
}

type TagFilterProps = {
  tags: string[];
  tagsInFilter: TagsInFilter;
};
// TODO: enable/disable filter
export function TagFilter({ tags, tagsInFilter: initTagsInFilter }: TagFilterProps) {
  const router = useRouter();

  const [tagsInFilter, setTagsInFilter] = useState(initTagsInFilter);
  const [enabled, setEnabled] = useState(tagsInFilter !== undefined);

  const handleSelect = (tagName: string) => {
    const url = new URL(window.location.href);

    url.searchParams.set(
      'tags',
      (tagsInFilter ?? []).concat(tagName).join(','),
    );

    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);

    setTagsInFilter(prev => (prev ?? []).concat(tagName));
  }

  const handleDeselect = (tagName: string) => {
    const url = new URL(window.location.href);

    url.searchParams.set(
      'tags',
      tagsInFilter?.filter(tag => tag !== tagName).join(',') ?? '',
    );

    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    setTagsInFilter(prev => (prev ?? []).filter(tag => tag !== tagName));
  }

  const handleToggleEnabled = () => {
    const url = new URL(window.location.href);

    if (enabled) {
      url.searchParams.delete('tags');
    } else {
      url.searchParams.set('tags', tagsInFilter?.join(',') ?? '');
    }

    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    setEnabled(prev => !prev);
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
    </fieldset>
  );
}
