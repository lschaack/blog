"use client";

import { HoverBubble } from "@/app/components/HoverBubble";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";

export default function Demo() {
  return (
    <BatchedAnimationContextProvider>
      <div className="w-full p-12 flex justify-center items-center">
        <HoverBubble
          boundary={8}
          rounding={9999}
          bubbleClassname="bg-black!"
          sluggishness={0.05}
          insetFilter={n => n}
          showIndicators
        >
          <div className="w-32 h-32" />
        </HoverBubble>
      </div>
    </BatchedAnimationContextProvider>
  )
}
