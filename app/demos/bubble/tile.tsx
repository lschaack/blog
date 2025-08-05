"use client";

import { PackedBubbleProps, PackedBubbles } from "@/app/components/PackedBubbles";
import { useEffect, useState } from "react";

export default function Demo(props: Partial<PackedBubbleProps>) {
  const [dpi, setDpi] = useState<number>();

  useEffect(() => setDpi(window.devicePixelRatio), []);

  return (
    <div className="w-full flex justify-center">
      {dpi && (
        <PackedBubbles
          randomStrategy="exponential"
          packingStrategy="pop"
          maxWidth={512}
          minRadius={16}
          ratio={8}
          seed={0}
          dpi={dpi}
          {...props}
        />
      )}
    </div>
  );
}
