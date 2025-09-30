import { ExampleCard } from "./ExampleCard";
import clsx from "clsx";
import { getTrainingExampleService } from "@/app/lib/trainingExampleService";
import { toLimitOffset } from "@/app/utils/pagination";
import { PageNav } from "../PageNav";

type ExampleBrowserProps = {
  page: number;
  perPage: number;
}

export async function ExampleBrowser(requestedPage: ExampleBrowserProps) {
  const { limit, offset } = toLimitOffset(requestedPage);

  const { items: examples, total: totalPages } = await getTrainingExampleService().getExamples(limit, offset);

  return (
    <div className="flex flex-col gap-4">
      <PageNav
        page={requestedPage.page}
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
        page={requestedPage.page}
        totalPages={totalPages}
      />
    </div>
  );
}
