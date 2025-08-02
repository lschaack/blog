"use client";

import { FC, useEffect, useRef, useState } from "react";
import { Circle } from "@timohausmann/quadtree-ts";
import clamp from "lodash/clamp";

import { CirclePacker, PackingStrategy, RandomStrategy } from "@/app/utils/circlePacker";
import { HoverBubble } from "@/app/components/HoverBubble";
import { magnitude } from "@/app/utils/mutableVector";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";
import { useResizeValue } from "@/app/hooks/useResizeValue";

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

export type PackedBubbleProps = {
  seed: number;
  packingStrategy: PackingStrategy;
  randomStrategy: RandomStrategy;
  maxWidth: number;
  minRadius: number;
  ratio: number;
}
export const PackedBubbles: FC<PackedBubbleProps> = ({
  seed,
  packingStrategy,
  randomStrategy,
  minRadius,
  ratio,
  maxWidth,
}) => {
  const [packedCircles, setPackedCircles] = useState<Circle[]>();

  const container = useRef<HTMLDivElement>(null);
  const containerWidth = useResizeValue<number>(
    () => container.current?.clientWidth ?? 0,
    0,
    () => [container.current],
    true
  );

  useEffect(() => {
    if (containerWidth) {
      (new CirclePacker({
        width: containerWidth,
        height: containerWidth,
        minRadius,
        maxRadius: Math.round(minRadius * ratio),
      }, packingStrategy, randomStrategy, undefined, undefined, seed))
        .pack()
        .then(circles => setPackedCircles(circles))
    }
  }, [containerWidth, minRadius, packingStrategy, randomStrategy, ratio, seed]);

  const diagonalLength = magnitude([containerWidth, containerWidth]);

  return (
    <BatchedAnimationContextProvider>
      <div
        ref={container}
        className="relative aspect-square w-screen bg-transparent"
        style={{ maxWidth }}
      >
        {packedCircles?.map((circle, index) => {
          const pos = magnitude([circle.x, circle.y]) / diagonalLength;

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
                className="h-full w-full -translate-1/2"
                rounding={9999}
                boundary={4}
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
