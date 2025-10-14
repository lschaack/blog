import { useMemo, useState } from 'react';
import { Popover } from 'radix-ui';
import { Plus } from "lucide-react";
import { ExquisiteCorpseTag } from '@prisma/client';

import { FuzzySearch } from '../components/FuzzySearch';

const createTag = (name: string) => {
  return fetch('/api/exquisite-corpse/tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })
}

type TagPickerProps = {
  tags: ExquisiteCorpseTag[];
  selectedTags: Set<ExquisiteCorpseTag>;
  onSelect: (tag: ExquisiteCorpseTag) => void;
  onDeselect: (tag: ExquisiteCorpseTag) => void;
}

export function TagPicker({ tags: initTags, selectedTags, onSelect }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<ExquisiteCorpseTag[]>(initTags);

  const tagMap = useMemo(() => Object.fromEntries(tags.map(tag => [tag.name, tag])), [tags]);

  const handleSelect = (item: ExquisiteCorpseTag) => {
    onSelect?.(item);
    setOpen(false);
    setQuery('');
  };

  const handleCreate = async (name: string) => {
    try {
      const response = await createTag(name);

      if (response.ok) {
        const tag = (await response.json()).tag;

        setTags(prev => [...prev, tag])
        onSelect(tag);
      }
    } catch (e) {
      // FIXME:
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col gap-2">
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
              onCreate={handleCreate}
              className="max-w-(--radix-popover-trigger-width) max-h-(--radix-popover-available-height)"
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <ul>
        {[...selectedTags.values()].map(tag => (
          <li
            key={`tag-${tag.name}`}
            className="p-1 bg-amber-200 font-geist-mono text-sm"
          >
            {tag.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
