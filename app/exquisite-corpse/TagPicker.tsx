import { useState } from 'react';
import { Popover } from 'radix-ui';
import { Plus, X, XCircle } from "lucide-react";
import { ExquisiteCorpseTag } from '@prisma/client';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

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

type TagProps = {
  name: string;
  onDelete: (tag: string) => void;
};
export function Tag({ name, onDelete }: TagProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li className="p-1 pl-2 bg-saguaro-100 font-geist-mono text-sm rounded-lg flex items-center gap-1">
      <span>
        {name}
      </span>
      <button
        onClick={() => onDelete(name)}
        className="p-1 w-3.5 h-3.5 relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="popLayout">
          {isHovered ? (
            <motion.div
              className="absolute inset-0"
              key="XCircle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <XCircle className="stroke-3 " size={14} />
            </motion.div>
          ) : (
            <motion.div
              className="absolute inset-0"
              key="X"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="stroke-3" size={14} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </li>
  )
}

type TagPickerProps = {
  tags: string[];
  selectedTags: Set<string>;
  onSelect: (tagName: string) => void;
  onDeselect: (tagName: string) => void;
  allowCreate?: boolean;
  hideLabel?: boolean;
}

export function TagPicker({
  tags: initTags,
  selectedTags,
  onSelect,
  onDeselect,
  allowCreate = false,
  hideLabel = false,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>(initTags);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = (item: string) => {
    onSelect?.(item);
    setOpen(false);
    setQuery('');
  };

  const handleCreate = async (name: string) => {
    setIsCreating(true);

    try {
      const response = await createTag(name);

      if (response.ok) {
        const tag: ExquisiteCorpseTag = await response.json();

        setTags(prev => [...prev, tag.name])
        onSelect(tag.name);
      }
    } catch (e) {
      // FIXME:
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col">
      <label
        htmlFor="add-tag"
        className={clsx(
          "font-geist-mono font-medium text-base/loose",
          hideLabel && "sr-only"
        )}
      >
        Tags
      </label>
      <div className="flex flex-col gap-2">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button id="add-tag" className="p-2 rounded-lg border-2 border-deep-500 bg-deep-100 font-geist-mono font-medium flex justify-between">
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
                items={tags}
                onSelect={handleSelect}
                onCreate={allowCreate ? handleCreate : undefined}
                isCreating={isCreating}
                className="max-w-(--radix-popover-trigger-width) max-h-(--radix-popover-available-height)"
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {!!selectedTags.size && (
          <ul className="flex flex-wrap gap-2 max-w-[512px]">
            {[...selectedTags.values()].map(tag => (
              <Tag
                key={`tag-${tag}`}
                name={tag}
                onDelete={onDeselect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
