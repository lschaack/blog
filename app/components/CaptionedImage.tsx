import Image from "next/image";

import type { CaptionedImage as CaptionedImageType } from "@/app/graphql/graphql";

export const CaptionedImage = ({ entry }: { entry: CaptionedImageType }) => {
  if (!entry.image?.url) {
    return <p>Image missing URL</p>;
  } else {
    return (
      <figure className="my-8 flex flex-col items-center gap-4">
        <Image
          src={entry.image.url}
          alt={entry.image.description!}
          width={entry.image.width!}
          height={entry.image.height!}
        />
        <figcaption className="text-center text-sm min-w-xs">
          {entry.caption}
        </figcaption>
      </figure>
    );
  }
}
