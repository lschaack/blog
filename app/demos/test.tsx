"use client";

import { useEffect, useState } from "react";
import { Circle } from "@timohausmann/quadtree-ts";

import { CirclePacker } from "@/app/utils/circlePacker";
import { HoverBubble } from "@/app/components/HoverBubble";

export default function Demo() {
  const [packedCircles, setPackedCircles] = useState<Circle[]>();

  useEffect(() => {
    (new CirclePacker({ width: 1024, height: 1024, minRadius: 32, maxRadius: 96 }))
      .pack()
      .then(circles => setPackedCircles(circles))
  }, []);

  return (
    <div className="relative" style={{ height: 1024, width: 1024 }}>
      {packedCircles?.map((circle, index) => (
        <div
          key={`bubble-${index}`}
          style={{
            position: 'absolute',
            top: circle.y,
            left: circle.x,
            width: circle.r * 2,
            height: circle.r * 2,
          }}
        >
          <HoverBubble
            className="absolute -top-1/2 -left-1/2 h-full w-full"
            rounding={9999}
            boundary={16}
            overkill={2}
          />
        </div>
      ))}
    </div>
  );
}
