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
      <div className="w-full flex justify-center items-center">
        <Demo />
      </div>
    );
  } else {
    notFound();
  }
}
