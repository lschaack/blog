"use client";

import { useRouter } from "next/navigation";

import { TagPicker } from "../TagPicker";

type TagFilterProps = {
  tags: string[];
  tagsInFilter: string[] | undefined;
};
// TODO: enable/disable filter
export function TagFilter({ tags, tagsInFilter }: TagFilterProps) {
  const router = useRouter();

  const handleSelect = (tagName: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      'tags',
      (tagsInFilter ?? []).concat(tagName).join(','),
    );

    router.push(url.href);
  }

  const handleDeselect = (tagName: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      'tags',
      tagsInFilter?.filter(tag => tag !== tagName).join(',') ?? '',
    );

    router.push(url.href);
  }

  return (
    <TagPicker
      tags={tags}
      selectedTags={new Set(tagsInFilter)}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
    />
  );
}
