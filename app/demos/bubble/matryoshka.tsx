"use client";

import { HoverBubble } from "@/app/components/HoverBubble";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";

export default function Demo() {
  return (
    <BatchedAnimationContextProvider>
      <div className="w-full p-12 flex justify-center items-center">
        <HoverBubble
          boundary={12}
          rounding={9999}
          bubbleClassname="bg-blue-300! border-blue-300/25!"
          overkill={2}
        >
          <div className="p-8">
            <HoverBubble
              boundary={12}
              rounding={9999}
              bubbleClassname="bg-green-300! border-green-300/25!"
              overkill={2}
            >
              <div className="p-4">
                <HoverBubble
                  boundary={12}
                  rounding={9999}
                  bubbleClassname="bg-slate-50! border-slate-50/25!"
                  overkill={2}
                >
                  <div className="p-4" />
                </HoverBubble>
              </div>
            </HoverBubble>
          </div>
        </HoverBubble>
      </div>
    </BatchedAnimationContextProvider>
  )
}
