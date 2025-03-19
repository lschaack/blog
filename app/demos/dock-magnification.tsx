'use client';

import Image from "next/image";

import { useResizeValue } from "@/app/hooks/useResizeValue";
import { useState } from "react";
import { CardMagnifier } from "@/app/components/CardMagnifier";
import { InputRange } from "@/app/components/InputRange";
import { AnimatedVariableMeter, AnimatedVariablesContext } from "../components/AnimatedVariables";
import { useLfo } from "../hooks/useLfo";

const ANIMATED_VARIABLES = new Map<string, string | number | boolean>();

const GAP_MIN = 0;
const GAP_MAX = 25;
const SCALE_MIN = 1;
const SCALE_MAX = 5;

export default function Demo() {
  const canFitFourCards = useResizeValue(() => window?.matchMedia('(min-width: 1024px)').matches, true);
  const [scale, setScale] = useState(3);
  const [falloff, setFalloff] = useState(3);
  const [gap, setGap] = useState(5);

  const [runLfo, setRunLfo] = useState(false);
  const scaleLfo = useLfo(1.5, 0, runLfo);
  const gapLfo = useLfo(2, 0.3, runLfo);

  const gapLfoValue = GAP_MIN + (gap - GAP_MIN) * (gapLfo + 1) / 2;
  const scaleLfoValue = SCALE_MIN + (scale - SCALE_MIN) * (scaleLfo + 1) / 2;

  return (
    <AnimatedVariablesContext.Provider value={ANIMATED_VARIABLES}>
      <div className="flex flex-col gap-4">
        <div>
          <input
            type="checkbox"
            id="runLfo"
            name="runLfo"
            checked={runLfo}
            onChange={e => setRunLfo(e.target.checked)}
          />
          <label htmlFor="runLfo">Run LFO</label>
        </div>
        {/* TODO: use grid like I obviously should when it's less late and I'm feeling less lazy */}
        <div className="flex gap-4">
          <div className="w-full flex flex-col gap-2">
            {/* FIXME: These stopped visually displaying the right values until the first rerender */}
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
              color="teal"
            />
            <AnimatedVariableMeter
              varName="normMousePosition"
              color="indigo"
            />
            <AnimatedVariableMeter
              varName="normShift"
              color="rose"
            />
          </div>
        </div>
        <CardMagnifier
          className="self-center sm:self-start"
          direction={canFitFourCards ? 'horizontal' : 'vertical'}
          scaleStrategy="cosEaseInOut"
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
