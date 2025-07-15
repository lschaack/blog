"use client";

import { HoverBubble } from "@/app/components/HoverBubble";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";

export default function Demo() {
  return (
    <BatchedAnimationContextProvider>
      <div className="w-full flex justify-center items-center">
        <HoverBubble
          boundary={8}
          rounding={9999}
          bubbleClassname="bg-black!"
          sluggishness={0.05}
          overkill={2}
          showIndicators
        >
          <div className="p-16 relative">
            <div className="p-4 rounded-full bg-white absolute right-1/4 top-1/5">
            </div>
          </div>
        </HoverBubble>
      </div>
    </BatchedAnimationContextProvider>
  )
}
