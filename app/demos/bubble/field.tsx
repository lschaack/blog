"use client";

import { useEffect, useMemo, useState } from "react";
import { randomInt } from "d3-random";

import { DEFAULT_RANDOM_STRATEGY, PackingStrategy, RANDOM_RADIUS_FNS, RandomStrategy } from "@/app/utils/circlePacker";
import { Button } from "@/app/components/Button";
import { Toggle } from "@/app/components/Toggle";
import { ExclusiveOptions, Option } from "@/app/components/ExclusiveOptions";
import { QueryParamProvider, useQueryState } from "@/app/hooks/useQueryState";
import { PackedBubbles } from "@/app/components/PackedBubbles";

const getRandomSeed = randomInt(999_999_999);

function HoverBubbleField() {
  const [seed, setSeed] = useQueryState<number>('seed');
  const [packingStrategy, setPackingStrategy] = useQueryState<PackingStrategy>('packingStrategy');
  const [randomStrategy, setRandomStrategy] = useQueryState<RandomStrategy>('randomStrategy');
  const [minRadius] = useQueryState<number>('minRadius');
  const [ratio] = useQueryState<number>('ratio');
  const [dpi, setDpi] = useState<number>();

  useEffect(() => setDpi(window.devicePixelRatio), []);

  if (seed && dpi) {
    return (
      <div className="flex flex-col gap-8">
        <PackedBubbles
          seed={seed}
          packingStrategy={packingStrategy}
          randomStrategy={randomStrategy}
          minRadius={minRadius}
          ratio={ratio}
          maxWidth={512}
          dpi={dpi}
        />
        <div className="flex flex-col gap-4 mx-8 min-[550px]:mx-0">
          <ExclusiveOptions
            name="Random strategy"
            onChange={e => setRandomStrategy(e.target.value as RandomStrategy)}
            value={randomStrategy}
            className="flex-row justify-between items-center"
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
            className="w-full flex-row justify-between items-center"
            label="Packing strategy"
            id="packing-strategy"
            value={packingStrategy === 'pop'}
            onChange={() => setPackingStrategy(packingStrategy === 'pop' ? 'shift' : 'pop')}
            enabledText="pop"
            disabledText="shift"
          />
          <Button
            label="Reroll"
            onClick={() => setSeed(getRandomSeed())}
          />
        </div>
      </div>
    );
  } else {
    return null;
  }
}

export default function Demo() {
  const queryParamOptions = useMemo(() => ({
    seed: getRandomSeed,
    packingStrategy: 'pop',
    randomStrategy: DEFAULT_RANDOM_STRATEGY,
    minRadius: 16,
    ratio: 8,
  }), []);

  return (
    <QueryParamProvider config={queryParamOptions}>
      <HoverBubbleField />
    </QueryParamProvider>
  )
}
