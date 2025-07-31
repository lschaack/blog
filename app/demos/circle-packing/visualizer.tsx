'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { randomInt } from 'd3-random';
import clamp from 'lodash/clamp';

import {
  CirclePacker,
  DEFAULT_RANDOM_STRATEGY,
  PackingArea,
  PackingState,
  PackingStrategy,
  RANDOM_RADIUS_FNS,
  RandomStrategy
} from '@/app/utils/circlePacker';
import { Button } from '@/app/components/Button';
import { useQueryState } from '@/app/hooks/useQueryState';
import { RichTextError } from '@/app/components/RichTextError';
import { InputRange } from '@/app/components/InputRange';
import { QueryParamProvider } from '@/app/hooks/useQueryState';
import { ExclusiveOptions, Option } from '@/app/components/ExclusiveOptions';
import { Toggle } from '@/app/components/Toggle';

const DEFAULT_CIRCLE_PACKER_AREA: PackingArea = {
  width: 512,
  height: 512,
  minRadius: 16,
  maxRadius: 128,
}

const drawCircles = (state: CirclePacker['state'], canvas: HTMLCanvasElement, params: PackingArea) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { circles, currentCircle, unoccupiedSectors } = state;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw unoccupied sectors for current circle
  if (currentCircle && unoccupiedSectors.length > 0) {
    ctx.save();
    unoccupiedSectors.forEach((sector, index) => {
      ctx.beginPath();
      ctx.moveTo(currentCircle.x, currentCircle.y);
      ctx.arc(
        currentCircle.x,
        currentCircle.y,
        currentCircle.r + params.maxRadius,
        sector.startAngle,
        sector.endAngle
      );
      ctx.closePath();

      // Use different colors for each sector
      const hue = (index * 60) % 360;
      ctx.fillStyle = `hsla(${hue}, 50%, 80%, 0.3)`;
      ctx.fill();

      ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
  }

  // Highlight current circle
  if (currentCircle) {
    ctx.beginPath();
    ctx.arc(currentCircle.x, currentCircle.y, currentCircle.r, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw circles
  circles.forEach((circle, index) => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI);

    // Use different colors for visual distinction
    const hue = (index * 137.5) % 360;
    const isNotLast = index < circles.length - 1;
    ctx.fillStyle = `hsla(${hue}, ${isNotLast ? '70%, 60%' : '100%, 95%'}, 0.7)`;
    ctx.fill();

    ctx.strokeStyle = `hsl(${hue}, 70%, 40%)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Draw circle count
  ctx.fillStyle = '#333';
  ctx.font = '16px monospace';
  ctx.fillText(`Circles: ${circles.length}`, 10, 25);
  if (currentCircle) {
    ctx.fillText(`Sectors: ${unoccupiedSectors.length}`, 10, 45);
  }
};

type PackingAnimationProps = {
  packingArea: PackingArea;
  seed: number;
  packingStrategy: PackingStrategy;
  randomStrategy: RandomStrategy;
}
function PackingAnimation({
  packingArea,
  seed,
  packingStrategy,
  randomStrategy,
}: PackingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [packer, setPacker] = useState<CirclePacker>();
  const [error, setError] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  const speed = useRef(DEFAULT_SPEED_MS);

  const onUpdate = useCallback((state: PackingState) => {
    if (canvasRef.current) {
      drawCircles(state, canvasRef.current, packingArea);
      // Small delay to allow rendering
      return new Promise<void>(resolve => setTimeout(resolve, MIN_SPEED_MS - speed.current));
    }

    return Promise.resolve();
  }, [packingArea]);

  const animate = useCallback(() => {
    const noop = () => undefined;

    try {
      const packer = new CirclePacker(
        packingArea,
        packingStrategy,
        randomStrategy,
        onUpdate,
        seed,
      );

      setIsGenerating(true);
      packer
        .pack()
        .then(() => setIsGenerating(false));

      setPacker(packer);

      return packer?.cancel ?? noop;
    } catch (e) {
      setError((e as Error).message);
    }

    return noop;
  }, [onUpdate, packingArea, packingStrategy, randomStrategy, seed]);

  // NOTE: Kind of a gross flow, but easiest b/c/o all the behavior I'm looking for:
  // - automatically start animation on prop change
  // - automatically clean up existing animation on restart
  // - enable mid-animation cancellation/restart
  useEffect(animate, [animate]);

  const coverage = packer
    ? ((packer.state.circles
      .reduce((sum, c) => sum + Math.PI * c.r * c.r, 0) / (packingArea.width * packingArea.height)) * 100)
      .toFixed(1)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden self-center">
        <canvas
          ref={canvasRef}
          width={packingArea.width}
          height={packingArea.height}
          className="block rounded-xl border-2 border-deep-500"
        />

        <div className="text-sm/loose text-gray-600 flex gap-8 justify-between">
          <p>Generated {packer?.state.circles.length ?? 0} circles</p>
          <p>Area coverage: {coverage}%</p>
        </div>
      </div>

      {error && (
        <RichTextError>{error}</RichTextError>
      )}

      <InputRange
        label="Speed"
        id="speed"
        min={MAX_SPEED_MS}
        max={MIN_SPEED_MS}
        step={1}
        onChange={value => speed.current = value}
        defaultValue={DEFAULT_SPEED_MS}
      />

      <div className="flex gap-8 justify-between">
        <Button
          onClick={animate}
          label={isGenerating ? 'Generating...' : 'Generate'}
          disabled={isGenerating}
        />

        <Button
          onClick={() => packer?.cancel()}
          label="Cancel"
          disabled={!isGenerating}
        />
      </div>
    </div>
  )
}

const getRandomSeed = randomInt(999_999_999);
// NOTE: These are flipped (min > max) b/c they represent a delay passed to setTimeout
const MAX_SPEED_MS = 0;
const MIN_SPEED_MS = 100;
const _DEFAULT_SPEED_VALUE = 20;
const DEFAULT_SPEED_MS = MIN_SPEED_MS - _DEFAULT_SPEED_VALUE;
const MIN_RATIO = 2;
const MAX_RATIO = 16;

// TODO: radius ratio
function PackingAnimationConfigurator() {
  const [area, setArea] = useState(DEFAULT_CIRCLE_PACKER_AREA);

  const [seed, setSeed] = useQueryState<number>('seed');
  const [packingStrategy, setPackingStrategy] = useQueryState<PackingStrategy>('packingStrategy');
  const [randomStrategy, setRandomStrategy] = useQueryState<RandomStrategy>('randomStrategy');

  return (
    <div className="flex flex-col gap-4 p-4 max-w-full" >
      <PackingAnimation
        packingArea={area}
        seed={seed}
        packingStrategy={packingStrategy}
        randomStrategy={randomStrategy}
      />

      <div className="flex flex-col gap-4 mx-8 min-[550px]:mx-0">
        <ExclusiveOptions
          name="Min radius"
          onChange={e => setArea(prev => {
            const nextMinRadius = Number(e.target.value);
            const currRatio = Math.round(prev.maxRadius / nextMinRadius);
            const nextRatio = clamp(currRatio, MIN_RATIO, MAX_RATIO);
            const nextMaxRadius = Math.round(nextMinRadius * nextRatio);

            return {
              ...prev,
              minRadius: nextMinRadius,
              maxRadius: nextMaxRadius,
            };
          })}
          value={area.minRadius}
          className="flex-row justify-between items-center"
        >
          <Option value={4} label="4" />
          <Option value={8} label="8" />
          <Option value={16} label="16" />
          <Option value={32} label="32" />
        </ExclusiveOptions>

        <ExclusiveOptions
          name="Ratio"
          onChange={e => setArea(prev => ({ ...prev, maxRadius: Math.round(prev.minRadius * Number(e.target.value)) }))}
          value={Math.round(area.maxRadius / area.minRadius)}
          className="flex-row justify-between items-center"
        >
          <Option value={MIN_RATIO} label={MIN_RATIO.toString()} />
          <Option value={4} label="4" />
          <Option value={8} label="8" />
          <Option value={MAX_RATIO} label={MAX_RATIO.toString()} />
        </ExclusiveOptions>


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
}

export default function Demo() {
  const queryParamConfig = useMemo(() => ({
    seed: getRandomSeed,
    packingStrategy: 'pop',
    randomStrategy: DEFAULT_RANDOM_STRATEGY,
  }), []);

  return (
    <QueryParamProvider config={queryParamConfig}>
      <PackingAnimationConfigurator />
    </QueryParamProvider>
  )
}
