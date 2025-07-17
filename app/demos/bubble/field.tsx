"use client";

import { FC, useCallback, useEffect, useRef, useState } from "react";
import { Circle } from "@timohausmann/quadtree-ts";
import clamp from "lodash/clamp";
import { randomInt } from "d3-random";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { CirclePacker, PackingStrategy, RANDOM_RADIUS_FNS, RandomStrategy } from "@/app/utils/circlePacker";
import { HoverBubble } from "@/app/components/HoverBubble";
import { magnitude } from "@/app/utils/mutableVector";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";
import { useResizeValue } from "@/app/hooks/useResizeValue";
import { Button } from "@/app/components/Button";
import { Toggle } from "@/app/components/Toggle";
import { ExclusiveOptions, Option } from "@/app/components/ExclusiveOptions";

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

type PackedBubbleProps = {
  seed: number;
  packingStrategy: PackingStrategy;
  randomStrategy: RandomStrategy;
  maxWidth: number;
}
const PackedBubbles: FC<PackedBubbleProps> = ({
  seed,
  packingStrategy,
  randomStrategy,
  maxWidth
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
        minRadius: 16,
        maxRadius: 128
      }, packingStrategy, randomStrategy, undefined, seed))
        .pack()
        .then(circles => setPackedCircles(circles))
    }
  }, [containerWidth, packingStrategy, randomStrategy, seed]);

  const diagonalLength = magnitude([containerWidth, containerWidth]);

  return (
    <BatchedAnimationContextProvider>
      <div
        ref={container}
        className="relative aspect-square w-screen"
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

const getRandomSeed = randomInt(999_999_999);

// TODO:
// make configurable:
// - seed
// - algorithm
// - decay
// - max_iters
export default function BubbleField() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const requestedSeed = searchParams.get('seed');

  const [packingStrategy, setPackingStrategy] = useState<PackingStrategy>('pop');
  const [randomStrategy, setRandomStrategy] = useState<RandomStrategy>('uniform');
  const seed = requestedSeed && parseInt(requestedSeed);

  const setRandomSeed = useCallback(() => {
    const writeableParams = new URLSearchParams(searchParams.toString());
    writeableParams.set('seed', getRandomSeed().toString());

    router.push(`${pathname}?${writeableParams}`)
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!seed) setRandomSeed();
  }, [pathname, requestedSeed, router, searchParams, seed, setRandomSeed]);

  if (seed) {
    return (
      <div className="flex flex-col gap-8">
        <PackedBubbles
          seed={seed}
          packingStrategy={packingStrategy}
          randomStrategy={randomStrategy}
          maxWidth={512}
        />
        <div className="flex flex-col gap-8 mx-8 min-[550px]:mx-0">
          <ExclusiveOptions
            name="Random strategy"
            onChange={e => setRandomStrategy(e.target.value as RandomStrategy)}
            color="indigo"
            value={randomStrategy}
          >
            {Object.keys(RANDOM_RADIUS_FNS).map(fnName => (
              <Option
                key={fnName}
                value={fnName}
                label={fnName}
              />
            ))}
          </ExclusiveOptions>
          <Toggle
            className="w-full"
            label="Packing strategy"
            id="packing-strategy"
            value={packingStrategy === 'pop'}
            onChange={() => setPackingStrategy(
              prev => prev === 'pop' ? 'shift' : 'pop'
            )}
            enabledText="pop"
            disabledText="shift"
          />
          <Button
            label="Reroll"
            onClick={setRandomSeed}
          />
        </div>
      </div>
    );
  } else {
    return null;
  }
}
