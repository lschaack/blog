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
          backgroundClassname="bg-virginia-sky-500!"
          overkill={2}
        >
          <div className="p-4">
            <HoverBubble
              boundary={12}
              rounding={9999}
              backgroundClassname="bg-prickly-pear-300!"
              overkill={2}
            >
              <div className="p-5">
                <HoverBubble
                  boundary={12}
                  rounding={9999}
                  backgroundClassname="bg-slate-50!"
                  overkill={2}
                >
                  <div className="p-8" />
                </HoverBubble>
              </div>
            </HoverBubble>
          </div>
        </HoverBubble>
      </div>
    </BatchedAnimationContextProvider>
  )
}
