'use client';

import Image from "next/image";

import { CardMagnifier } from "@/app/components/CardMagnifier";
import { AnimatedVariablesContext, AnimatedVariableValue } from "@/app/components/AnimatedVariables";

const ANIMATED_VARIABLES = new Map<string, string | number | boolean>();

export default function Demo() {
  return (
    <AnimatedVariablesContext.Provider value={ANIMATED_VARIABLES}>
      <div className="font-geist-mono flex flex-col gap-2">
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
          src="/babushka.jpeg"
          height={640}
          width={640}
          alt="Orzo looking tragic immediately after a bath, towel draped over his head"
          priority
        />
        <Image
          src="/blep.jpeg"
          height={640}
          width={640}
          alt="My dog Orzo getting way too close to the camera with dirt on his nose and the tip of his tongue sticking out"
          priority
        />
        <Image
          src="/happy-girl.jpeg"
          height={640}
          width={640}
          alt="My dog Pinto looking completely at peace in a field of some kind of tall grass"
          priority
        />
        <Image
          src="/triptych.jpeg"
          height={640}
          width={640}
          alt="A triptych of orzo eating a fortune cookie, seeing the fortune, and eating that too"
          priority
        />
        <Image
          src="/cozy-grass.jpeg"
          height={640}
          width={640}
          alt="Pinto laying as flat as possible with her nose pressed into some freshly-cut grass"
          priority
        />
        <Image
          src="/leap.jpeg"
          height={640}
          width={640}
          alt="A photo of me staring at a ball with bulging eyes while my dog Orzo sits on my shoulder doing the same thing"
          priority
        />
        <Image
          src="/AC.jpeg"
          height={640}
          width={640}
          alt="Somebody else's dog in Honolulu, getting a break from the heat outside in an air conditioned shop"
          priority
        />
      </CardMagnifier>
    </AnimatedVariablesContext.Provider>
  );
}
