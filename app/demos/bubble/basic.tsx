"use client";

import { HoverBubble } from "@/app/components/HoverBubble";

export default function Demo() {
  return (
    <div className="w-full p-12 flex justify-center items-center">
      <HoverBubble
        boundary={32}
        rounding={32}
        bubbleClassname="bg-black!"
        sluggishness={1}
        insetFilter={n => n}
      />
    </div>
  )
}
