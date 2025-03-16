'use client';

import Image from "next/image";

import { MagnificationTester } from "../components/CardMagnifier";
import { useResizeValue } from "@/app/hooks/useResizeValue";


const DockMagnificationDemo = () => {
  const canFitFourCards = useResizeValue(() => window?.matchMedia('(min-width: 1024px)').matches, true);

  return (
    <MagnificationTester
      basis={80}
      gap={5}
      direction={canFitFourCards ? 'horizontal' : 'vertical'}
      className="self-center sm:self-start"
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
    </MagnificationTester>
  );
}

export default DockMagnificationDemo;
