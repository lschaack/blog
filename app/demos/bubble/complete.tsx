"use client";

import { HoverBubble } from "@/app/components/HoverBubble";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";

export default function Demo() {
  return (
    <BatchedAnimationContextProvider>
      <div className="w-full p-12 flex justify-center items-center">
        <HoverBubble
          boundary={8}
          rounding={128}
          bubbleClassname="bg-white! mix-blend-normal!"
          sluggishness={0.05}
        >
          <div className="p-16 flex justify-center items-center" />
        </HoverBubble>
      </div>
    </BatchedAnimationContextProvider>
  )
}
