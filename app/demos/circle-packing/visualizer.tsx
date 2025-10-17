'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { randomInt } from 'd3-random';
import clamp from 'lodash/clamp';
import Link from 'next/link';

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
import { useSearchParams } from 'next/navigation';

const WIDTH = 512;
const HEIGHT = 512;

// NOTE: These are flipped (min > max) b/c they represent a delay passed to setTimeout
const MAX_SPEED_MS = 0;
const MIN_SPEED_MS = 1000;
const DEFAULT_SPEED_MS = 900;
const MIN_RATIO = 2;
const MAX_RATIO = 16;

const getRandomSeed = randomInt(999_999_999);

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
  const firstLine = `Circles: ${circles.length}`;
  const secondLine = `Sectors: ${unoccupiedSectors.length}`;
  const firstLineMeta = ctx.measureText(firstLine);
  const lineHeight = firstLineMeta.fontBoundingBoxAscent + firstLineMeta.fontBoundingBoxDescent;

  ctx.lineWidth = 6;
  ctx.font = 'bold 36px monospace';
  ctx.strokeStyle = '#333';
  ctx.fillStyle = '#fff';

  ctx.strokeText(firstLine, 10, lineHeight);
  ctx.fillText(firstLine, 10, lineHeight);

  ctx.strokeText(secondLine, 10, lineHeight * 2);
  ctx.fillText(secondLine, 10, lineHeight * 2);
};

type PackingAnimationProps = {
  packingArea: PackingArea;
  seed: number;
  packingStrategy: PackingStrategy;
  randomStrategy: RandomStrategy;
  scale: number;
}
function PackingAnimation({
  packingArea: _packingArea,
  seed,
  packingStrategy,
  randomStrategy,
  scale,
}: PackingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const packingArea = useMemo(
    () => Object.fromEntries(
      Object
        .entries(_packingArea)
        .map(([key, value]) => [key, value * scale])
    ) as unknown as PackingArea,
    [_packingArea, scale]
  );

  const [packer, setPacker] = useState<CirclePacker>();
  const [error, setError] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(true);

  const speed = useRef(DEFAULT_SPEED_MS);

  const onUpdate = useCallback((state: PackingState) => {
    if (canvasRef.current) {
      // Don't draw until last iter at max speed
      if (speed.current < MIN_SPEED_MS) {
        drawCircles(state, canvasRef.current, packingArea);

        return new Promise<void>(resolve => setTimeout(resolve, MIN_SPEED_MS - speed.current));
      } else {
        return Promise.resolve();
      }
    }

    return Promise.resolve();
  }, [packingArea]);

  const onFinish = useCallback((state: PackingState) => {
    if (canvasRef.current) drawCircles(state, canvasRef.current, packingArea);
  }, [packingArea]);

  const animate = useCallback(() => {
    const noop = () => undefined;

    try {
      const nextPacker = new CirclePacker(
        packingArea,
        packingStrategy,
        randomStrategy,
        onUpdate,
        onFinish,
        seed,
      );

      setIsGenerating(true);
      nextPacker
        .pack()
        .then(() => setIsGenerating(false));

      setPacker(prev => {
        prev?.cancel();

        return nextPacker;
      });
    } catch (e) {
      setError((e as Error).message);
    }

    return noop;
  }, [onFinish, onUpdate, packingArea, packingStrategy, randomStrategy, seed]);

  // NOTE: Kind of a gross flow, but easiest b/c/o all the behavior I'm looking for:
  // - automatically start animation on prop change
  // - automatically clean up existing animation on restart
  // - enable mid-animation cancellation/restart
  useEffect(animate, [animate]);

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        width={packingArea.width}
        height={packingArea.height}
        className="block rounded-xl border-2 border-deep-500"
        // use dpi-scaled area for canvas coords but regular area for element size,
        // effectively scaling demo resolution with the user's screen
        style={{
          maxWidth: _packingArea.width,
          maxHeight: _packingArea.height,
        }}
      />

      {error && (
        <RichTextError>{error}</RichTextError>
      )}

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

      {/* FIXME: The easing is great, but prevents reaching the max value, skipping the animation */}
      <InputRange
        label="Speed"
        id="speed"
        easing="easeOut"
        min={MAX_SPEED_MS}
        max={MIN_SPEED_MS}
        step={1}
        precision={0}
        onChange={value => speed.current = value}
        defaultValue={DEFAULT_SPEED_MS}
      />
    </div>
  )
}

function PackingAnimationConfigurator() {
  const searchParams = useSearchParams();

  const [seed, setSeed] = useQueryState<number>('seed');
  const [packingStrategy, setPackingStrategy] = useQueryState<PackingStrategy>('packingStrategy');
  const [randomStrategy, setRandomStrategy] = useQueryState<RandomStrategy>('randomStrategy');
  const [minRadius, setMinRadius] = useQueryState<number>('minRadius');
  const [ratio, setRatio] = useQueryState<number>('ratio');

  const [dpi, setDpi] = useState<number>();

  useEffect(() => setDpi(window.devicePixelRatio), [])

  const maxRadius = minRadius * ratio;
  const area = useMemo(() => ({
    width: WIDTH,
    height: HEIGHT,
    minRadius,
    maxRadius,
  }), [maxRadius, minRadius]);

  return (
    <div className="flex flex-col gap-4 max-w-full" >
      {dpi !== undefined ? (
        <PackingAnimation
          packingArea={area}
          seed={seed}
          packingStrategy={packingStrategy}
          randomStrategy={randomStrategy}
          scale={dpi}
        />
      ) : (
        <div style={{ width: area.width, height: area.height }} />
      )}

      <div className="flex flex-col gap-4">
        <ExclusiveOptions
          name="Min radius"
          onChange={e => {
            const nextMinRadius = Number(e.target.value);
            const rawNextRatio = Math.round(maxRadius / nextMinRadius);
            const nextRatio = clamp(rawNextRatio, MIN_RATIO, MAX_RATIO);

            setMinRadius(nextMinRadius);
            setRatio(nextRatio);
          }}
          value={minRadius}
          className="flex-row justify-between items-center"
        >
          <Option value={4} label="4" />
          <Option value={8} label="8" />
          <Option value={16} label="16" />
          <Option value={32} label="32" />
        </ExclusiveOptions>

        <ExclusiveOptions
          name="Ratio"
          onChange={e => setRatio(Number(e.target.value))}
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
          label="Packing strategy"
          id="packing-strategy"
          value={packingStrategy === 'pop'}
          onChange={() => setPackingStrategy(packingStrategy === 'pop' ? 'shift' : 'pop')}
          enabledText="pop"
          disabledText="shift"
          asRow
        />

        <Button
          label="Reroll"
          onClick={() => setSeed(getRandomSeed())}
        />

        <Link
          href={`/demos/bubble-field?${searchParams.toString()}`}
          className="classic-link"
        >
          Go to bubble field demo with these settings
        </Link>
      </div>
    </div>
  );
}

export default function Demo() {
  const queryParamConfig = useMemo(() => ({
    seed: getRandomSeed,
    packingStrategy: 'pop',
    randomStrategy: DEFAULT_RANDOM_STRATEGY,
    minRadius: 16,
    ratio: 8,
  }), []);

  return (
    <QueryParamProvider config={queryParamConfig}>
      <PackingAnimationConfigurator />
    </QueryParamProvider>
  )
}
