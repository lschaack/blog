import { useState } from 'react';
import { Popover } from 'radix-ui';
import { Plus } from "lucide-react";
import { FuzzySearch } from '../components/FuzzySearch';

export function TagPicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

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
            // TODO:
            items={[]}
            // TODO:
            onSelect={() => undefined}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
