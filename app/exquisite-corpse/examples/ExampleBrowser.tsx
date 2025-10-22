import clsx from "clsx";
import Link from "next/link";

import { ExampleCard } from "./ExampleCard";
import { type TrainingExampleService } from "@/app/lib/trainingExampleService";
import { PageNav } from "../PageNav";
import { DebugMenu } from "@/app/components/DebugMenu";
import { type TagService } from "@/app/lib/tagService";
import { TagFilter, TagsInFilter } from "./TagFilter";
import { Plus } from "lucide-react";

export type ExampleFilter = {
  tags: TagsInFilter;
}
type ExampleBrowserProps = {
  tags: Awaited<ReturnType<TagService['getTags']>>;
  examples: Awaited<ReturnType<TrainingExampleService['getExamples']>>['items'];
  page: number;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  filter: ExampleFilter;
  onFilterChange: (filter: ExampleFilter) => void;
}

export function ExampleBrowser({
  tags,
  examples,
  page,
  totalPages,
  totalItems,
  onPageChange,
  filter,
  onFilterChange,
}: ExampleBrowserProps) {
  return (
    <div className="flex flex-col gap-4">
      <DebugMenu>
        <TagFilter
          tags={tags.map(tag => tag.name)}
          tagsInFilter={filter.tags}
          onChange={tags => onFilterChange({ tags })}
          totalItems={totalItems}
        />
      </DebugMenu>

      <Link href="/exquisite-corpse/examples/new" className="classic-link">
        <Plus size={16} className="inline align-text-bottom mr-1" />
        Create new training example
      </Link>

      <PageNav
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <ul
        className={clsx(
          "gap-4 grid auto-rows-fr grid-flow-row",
          "sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {examples.map(example => (
          <li key={example.id}>
            <ExampleCard exampleData={example} />
          </li>
        ))}
      </ul>

      <PageNav
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
