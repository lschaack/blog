import { notFound } from "next/navigation";
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
      <div className="p-6 rounded-4xl h-fit flex justify-center items-center bg-slate-50/95">
        <Demo />
      </div>
    );
  } else {
    notFound();
  }
}
