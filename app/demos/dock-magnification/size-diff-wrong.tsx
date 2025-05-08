'use client';

import Image from "next/image";

import { CardMagnifier } from "@/app/components/CardMagnifier";
import { AnimatedVariablesContext, AnimatedVariableValue } from "@/app/components/AnimatedVariables";

const ANIMATED_VARIABLES = new Map<string, string | number | boolean>();

export default function Demo() {
  return (
    <AnimatedVariablesContext.Provider value={ANIMATED_VARIABLES}>
      <div className="font-mono flex flex-col gap-2">
        <AnimatedVariableValue
          varName="expectedSizeDiffWrong"
          displayName="Expected"
        />
        <AnimatedVariableValue
          varName="observedSizeDiff"
          displayName="Observed"
        />
      </div>
      <CardMagnifier
        className="self-center sm:self-start mt-2"
        scaleStrategy="cosEaseInOut"
        shiftStrategy="elegantAndWrong"
        basis={80}
        scale={3}
        falloff={3}
        gap={5}
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
      </CardMagnifier>
    </AnimatedVariablesContext.Provider>
  );
}
