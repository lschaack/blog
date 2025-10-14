'use client';

import { useMemo, useState } from 'react';
import { Popover } from 'radix-ui';
import { Plus } from "lucide-react";
import { FuzzySearch } from '../components/FuzzySearch';
import { ExquisiteCorpseTag } from '@prisma/client';

type TagPickerProps = {
  tags: ExquisiteCorpseTag[];
  onSelect?: (tag: ExquisiteCorpseTag) => void;
}

export function TagPicker({ tags, onSelect }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const tagMap = useMemo(() => Object.fromEntries(tags.map(tag => [tag.name, tag])), [tags]);

  const handleSelect = (item: ExquisiteCorpseTag) => {
    onSelect?.(item);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="p-2 rounded-lg border-2 border-deep-500 bg-deep-100 font-geist-mono font-medium flex justify-between">
          <span>
            Add a tag
          </span>
          <Plus size={24} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4}>
          <FuzzySearch
            value={query}
            onChange={setQuery}
            items={Object.keys(tagMap)}
            onSelect={tagName => handleSelect(tagMap[tagName])}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
