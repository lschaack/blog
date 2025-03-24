'use client';

import Image from "next/image";
import { useState } from "react";

import { CardMagnifier, ScaleStrategy, ShiftStrategy } from "@/app/components/CardMagnifier";
import { InputRange } from "@/app/components/InputRange";
import { AnimatedVariableMeter, AnimatedVariablesContext } from "@/app/components/AnimatedVariables";
import { useLfo } from "@/app/hooks/useLfo";
import { ExclusiveOptions, Option } from "@/app/components/ExclusiveOptions";
import { Toggle } from "@/app/components/Toggle";

const ANIMATED_VARIABLES = new Map<string, string | number | boolean>();
const STABLE_SCALE_STRATEGIES = new Set<Partial<ScaleStrategy>>(['cosEaseInOut', 'linear', 'square']);

const GAP_MIN = 0;
const GAP_MAX = 25;
const SCALE_MIN = 1;
const SCALE_MAX = 5;

export default function Demo() {
  // TODO: Update this query or get rid of horizontal/vertical switching
  //const canFitFourCards = useResizeValue(() => window?.matchMedia('(min-width: 1024px)').matches, true);
  const [scale, setScale] = useState(3);
  const [falloff, setFalloff] = useState(3);
  const [gap, setGap] = useState(5);

  const [scaleStrategy, setScaleStrategy] = useState<ScaleStrategy>('cosEaseInOut');
  const [shiftStrategy, setShiftStrategy] = useState<ShiftStrategy>('elegant');

  const [runLfo, setRunLfo] = useState(false);
  const scaleLfo = useLfo(1.5, 0, runLfo);
  const gapLfo = useLfo(2, 0.3, runLfo);

  const gapLfoValue = GAP_MIN + (gap - GAP_MIN) * (gapLfo + 1) / 2;
  const scaleLfoValue = SCALE_MIN + (scale - SCALE_MIN) * (scaleLfo + 1) / 2;

  const elegantShiftDisabled = !STABLE_SCALE_STRATEGIES.has(scaleStrategy);

  return (
    <AnimatedVariablesContext.Provider value={ANIMATED_VARIABLES}>
      <div className="flex flex-col gap-4">
        <Toggle
          id="runLfo"
          label="Run LFO"
          onChange={value => setRunLfo(value)}
          color="rose"
          value={runLfo}
        />
        <ExclusiveOptions
          name="Shift strategy"
          onChange={e => setShiftStrategy(e.target.value as ShiftStrategy)}
          color="lime"
          value={shiftStrategy}
        >
          <Option<ShiftStrategy>
            value="accurate"
            label="Accurate"
          />
          <Option<ShiftStrategy>
            value="elegant"
            label="Elegant"
            disabled={elegantShiftDisabled}
          />
          <Option<ShiftStrategy>
            value="disabled"
            label="Disabled"
          />
        </ExclusiveOptions>
        <ExclusiveOptions
          name="Scale strategy"
          onChange={e => {
            const strategy = e.target.value as ScaleStrategy;
            setScaleStrategy(strategy);

            if (!STABLE_SCALE_STRATEGIES.has(strategy)) setShiftStrategy('accurate');
          }}
          color="indigo"
          value={scaleStrategy}
        >
          <Option<ScaleStrategy> value="cosEaseInOut" label="Ease In/Out" />
          <Option<ScaleStrategy> value="linear" label="Linear" />
          <Option<ScaleStrategy> value="square" label="Square" />
          <Option<ScaleStrategy> value="marching" label="Marching" />
        </ExclusiveOptions>
        {/* TODO: use grid like I obviously should when it's less late and I'm feeling less lazy */}
        <div className="flex gap-4">
          <div className="w-full flex flex-col gap-2">
            <InputRange
              label="Scale"
              id="scale"
              color="amber"
              min={SCALE_MIN}
              // FIXME: scale values above 5 show an apparent discontinuity in the level of shift
              // through the easing animation, seems to just grow in noticeability w/large shifts
              // or gaps
              max={SCALE_MAX}
              defaultValue={scale}
              step={0.1}
              onChange={setScale}
            />
            <InputRange
              label="Falloff"
              id="falloff"
              color="lime"
              min={1}
              max={10}
              defaultValue={falloff}
              step={1.0}
              onChange={setFalloff}
            />
            <InputRange
              label="Gap"
              id="gap"
              color="cyan"
              min={GAP_MIN}
              max={GAP_MAX}
              defaultValue={gap}
              step={1.0}
              onChange={setGap}
            />
          </div>
          <div className="w-full flex flex-col gap-2">
            <AnimatedVariableMeter
              varName="easingFactor"
              displayName="Easing"
              color="teal"
            />
            <AnimatedVariableMeter
              varName="normMousePosition"
              displayName="Position"
              color="indigo"
            />
            <AnimatedVariableMeter
              varName="normShift"
              displayName="Shift"
              color="rose"
            />
          </div>
        </div>
        <CardMagnifier
          className="self-center sm:self-start"
          scaleStrategy={scaleStrategy}
          shiftStrategy={shiftStrategy}
          basis={80}
          scale={runLfo ? scaleLfoValue : scale}
          falloff={falloff}
          gap={runLfo ? gapLfoValue : gap}
        >
          <Image
            src="/ball thrower.jpeg"
            height={640}
            width={640}
            alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
            priority
          />
          <Image
            src="/ball thrower.jpeg"
            height={640}
            width={640}
            alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
            priority
          />
          <Image
            src="/ball thrower.jpeg"
            height={640}
            width={640}
            alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
            priority
          />
          <Image
            src="/ball thrower.jpeg"
            height={640}
            width={640}
            alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
            priority
          />
          <Image
            src="/ball thrower.jpeg"
            height={640}
            width={640}
            alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
            priority
          />
          <Image
            src="/ball thrower.jpeg"
            height={640}
            width={640}
            alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
            priority
          />
          <Image
            src="/ball thrower.jpeg"
            height={640}
            width={640}
            alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
            priority
          />
        </CardMagnifier>
      </div>
    </AnimatedVariablesContext.Provider>
  );
}
