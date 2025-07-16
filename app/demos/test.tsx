"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle } from "@timohausmann/quadtree-ts";
import clamp from "lodash/clamp";

import { CirclePacker } from "@/app/utils/circlePacker";
import { HoverBubble } from "@/app/components/HoverBubble";
import { magnitude } from "@/app/utils/mutableVector";
import { BatchedAnimationContextProvider } from "../hooks/useBatchedAnimation";
import { useResizeValue } from "../hooks/useResizeValue";

const virginiaSky400 = {
  r: 74,
  g: 125,
  b: 205,
};

const saguaro300 = {
  r: 161,
  g: 218,
  b: 98,
};

const pricklyPear300 = {
  r: 240,
  g: 117,
  b: 181,
};

const triangle = (x: number) => 1 - Math.abs(clamp(x * 2, -1, 1));

const getColor = (pos: number) => {
  const first = triangle(pos);
  const second = triangle(pos - 0.5);
  const third = triangle(pos - 1);

  return {
    r: virginiaSky400.r * first + saguaro300.r * second + pricklyPear300.r * third,
    g: virginiaSky400.g * first + saguaro300.g * second + pricklyPear300.g * third,
    b: virginiaSky400.b * first + saguaro300.b * second + pricklyPear300.b * third,
  }
}

const WIDTH = 512;
const HEIGHT = 512;
const DIAGONAL_LENGTH = magnitude([WIDTH, HEIGHT]);

// TODO:
// make configurable:
// - decay
// - max_iters
export default function Demo() {
  const [packedCircles, setPackedCircles] = useState<Circle[]>();
  const container = useRef<HTMLDivElement>(null);
  const prevWidth = useRef(0);
  const containerWidth = useResizeValue(
    () => container.current?.clientWidth,
    0,
    () => [container.current],
    true
  );

  useEffect(() => {
    if (containerWidth && containerWidth !== prevWidth.current) {
      (new CirclePacker({
        width: containerWidth,
        height: containerWidth,
        minRadius: 16,
        maxRadius: 128
      }))
        .pack()
        .then(circles => setPackedCircles(circles))

      prevWidth.current = containerWidth;
    }
  }, [containerWidth]);

  return (
    <BatchedAnimationContextProvider>
      <div
        ref={container}
        className="relative aspect-square w-screen"
        style={{ maxWidth: WIDTH }}
      >
        {packedCircles?.map((circle, index) => {
          const pos = magnitude([circle.x, circle.y]) / DIAGONAL_LENGTH;

          return (
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
                boundary={8}
                overkill={2}
                backgroundColor={`rgb(${Object.values(getColor(pos)).join(', ')})`}
              />
            </div>
          )
        })}
      </div>
    </BatchedAnimationContextProvider>
  );
}
