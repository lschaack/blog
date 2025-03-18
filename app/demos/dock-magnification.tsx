'use client';

import Image from "next/image";

import { useResizeValue } from "@/app/hooks/useResizeValue";
import { useState } from "react";
import { CardMagnifier } from "../components/CardMagnifier";
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
  const scaleLfo = useLfo(1.5, 0);
  const gapLfo = useLfo(2, 0.3);

  const gapLfoValue = GAP_MIN + (gap - GAP_MIN) * (gapLfo + 1) / 2;
  const scaleLfoValue = SCALE_MIN + (scale - SCALE_MIN) * (scaleLfo + 1) / 2;

  return (
    <AnimatedVariablesContext.Provider value={ANIMATED_VARIABLES}>
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
      <div>
        <input
          type="range"
          id="scale"
          name="scale"
          min={SCALE_MIN}
          // FIXME: scale values above 5 show an apparent discontinuity in the level of shift
          // through the easing animation, seems to just grow in noticeability w/large shifts
          // or gaps
          max={SCALE_MAX}
          value={scale}
          step={0.1}
          onChange={e => setScale(e.target.valueAsNumber)}
        />
        <label htmlFor="scale">Scale</label>
      </div>
      <div>
        <input
          type="range"
          id="falloff"
          name="falloff"
          min={1}
          max={10}
          value={falloff}
          step={1.0}
          onChange={e => setFalloff(e.target.valueAsNumber)}
        />
        <label htmlFor="falloff">Falloff</label>
      </div>
      <div>
        <input
          type="range"
          id="gap"
          name="gap"
          min={GAP_MIN}
          max={GAP_MAX}
          value={gap}
          step={1.0}
          onChange={e => setGap(e.target.valueAsNumber)}
        />
        <label htmlFor="gap">Gap</label>
      </div>
      <AnimatedVariableMeter varName="easingFactor" />
      <AnimatedVariableMeter varName="normMousePosition" />
      <AnimatedVariableMeter varName="normShift" />
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
    </AnimatedVariablesContext.Provider>
  );
}
