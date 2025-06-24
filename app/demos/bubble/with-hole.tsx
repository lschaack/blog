"use client";

import { HoverBubble } from "@/app/components/HoverBubble";

export default function Demo() {
  return (
    <div className="w-full p-12 flex justify-center items-center">
      <HoverBubble
        boundary={4}
        rounding={64}
        bubbleClassname="bg-black!"
        sluggishness={1}
        insetFilter={n => n}
      >
        <div className="w-32 h-32" />
      </HoverBubble>
    </div>
  )
}

