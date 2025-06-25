"use client";

import { HoverBubble } from "@/app/components/HoverBubble";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";

export default function Demo() {
  return (
    <BatchedAnimationContextProvider>
      <div className="w-full p-12 flex justify-center items-center">
        <HoverBubble
          boundary={8}
          rounding={64}
          bubbleClassname="bg-black!"
          innerBubbleClassname="bg-black! mix-blend-normal"
          sluggishness={0.05}
        >
          <div className="w-32 h-32 flex justify-center items-center">
            <div className="w-4 h-4 rounded-full bg-white" />
          </div>
        </HoverBubble>
      </div>
    </BatchedAnimationContextProvider>
  )
}
