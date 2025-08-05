import { notFound } from "next/navigation";
import clsx from "clsx";

import { DEMOS } from "@/app/demos";

export default async function Demo({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;

  const Demo = DEMOS[slug as keyof typeof DEMOS];

  if (Demo) {
    return (
      <div className={clsx(
        "p-6 rounded-4xl h-fit max-w-full flex justify-center items-center bg-slate-50/95",
        // fade in demos that require DOM measurements before rendering
        "transition-opacity duration-200 opacity-0 not-empty:opacity-100",
      )}>
        <Demo />
      </div>
    );
  } else {
    notFound();
  }
}
