'use client';

import Image from "next/image";

import { CardMagnifier } from "@/app/components/CardMagnifier";

export default function Demo() {
  return (
    <CardMagnifier
      className="self-center sm:self-start"
      scaleStrategy="cosEaseInOut"
      shiftStrategy="elegant"
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
  );
}
