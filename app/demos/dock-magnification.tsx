'use client';

import Image from "next/image";

import { useResizeValue } from "@/app/hooks/useResizeValue";
import { useState } from "react";
import { CardMagnifier } from "../components/CardMagnifier";
import { AnimatedVariableMeter, AnimatedVariablesContext } from "../components/AnimatedVariables";

const ANIMATED_VARIABLES = new Map<string, string | number | boolean>();

export default function Demo() {
  const canFitFourCards = useResizeValue(() => window?.matchMedia('(min-width: 1024px)').matches, true);
  // TODO: add LFO to these
  // if I add an LFO button to every animatable property -
  //   no controls just ~1/3hz using Date.now() as an input to Math.sin()
  //   w/random offset so they're not in phase
  const [scale, setScale] = useState(3);
  const [falloff, setFalloff] = useState(3);
  const [gap, setGap] = useState(20);

  return (
    <AnimatedVariablesContext.Provider value={ANIMATED_VARIABLES}>
      <div>
        <input
          type="range"
          id="scale"
          name="scale"
          min={1}
          // FIXME: scale values above 5 show an apparent discontinuity in the level of shift
          // through the easing animation, seems to just grow in noticeability w/large shifts
          // or gaps
          max={5}
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
          min={0}
          max={25}
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
        scale={scale}
        falloff={falloff}
        gap={gap}
      >
        <Image
          src="/magnification tester.jpg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
          priority
        />
        <Image
          src="/magnification tester.jpg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
          priority
        />
        <Image
          src="/magnification tester.jpg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
          priority
        />
        <Image
          src="/magnification tester.jpg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
          priority
        />
        <Image
          src="/magnification tester.jpg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
          priority
        />
        <Image
          src="/magnification tester.jpg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
          priority
        />
        <Image
          src="/magnification tester.jpg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing."
          priority
        />
      </CardMagnifier>
    </AnimatedVariablesContext.Provider>
  );
}
