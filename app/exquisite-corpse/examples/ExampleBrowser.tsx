import { ExampleCard } from "./ExampleCard";
import clsx from "clsx";
import { getTrainingExampleService } from "@/app/lib/trainingExampleService";
import { toLimitOffset } from "@/app/utils/pagination";
import { PageNav } from "../PageNav";
import { DebugMenu } from "@/app/components/DebugMenu";
import { getTagService } from "@/app/lib/tagService";
import { auth } from "@/app/auth";
import { TagFilter } from "./TagFilter";

type ExampleBrowserProps = {
  page: number;
  perPage: number;
  tagFilter: string[] | undefined;
}

export async function ExampleBrowser({ page, perPage, tagFilter }: ExampleBrowserProps) {
  const { limit, offset } = toLimitOffset({ page, perPage });

  const {
    items: examples,
    total: totalPages
  } = await getTrainingExampleService().getExamples(limit, offset, tagFilter);

  const session = await auth();
  const tags = await getTagService().getTags(session);

  return (
    <div className="flex flex-col gap-4">
      <DebugMenu>
        <TagFilter
          tags={tags.map(tag => tag.name)}
          tagsInFilter={tagFilter}
        />
      </DebugMenu>

      <PageNav
        page={page}
        totalPages={totalPages}
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
      />
    </div>
  );
}
