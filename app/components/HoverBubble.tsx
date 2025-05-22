"use client";

import { FC, MouseEventHandler, ReactNode, useEffect, useRef, useState } from "react";

import { zipWith } from "lodash";

const BORDER = 20;
const STIFFNESS = 0.005;
const DECAY = 0.95;

const magnitude = <T extends number[]>(vector: T) => {
  return Math.sqrt(
    vector.reduce(
      (sum, n) => sum + n ** 2,
      0
    )
  )
}

const normalize = <T extends number[]>(vector: T) => {
  const mag = magnitude(vector);

  // TODO: should I be more explicit in warning about this?
  if (mag === 0) return vector;

  return vector.map(n => n / mag) as T;
}

export const HoverBubble: FC<{ children?: ReactNode }> = ({ children }) => {
  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const containerElement = useRef<HTMLDivElement>(null);
  const velocity = useRef<[number, number]>([0, 0]);

  const handleMouseMove: MouseEventHandler = event => {
    if (containerElement.current) {
      const {
        offsetTop,
        offsetLeft,
        offsetWidth,
        offsetHeight,
      } = containerElement.current;

      const relativeY = event.pageY - offsetTop;
      const relativeX = event.pageX - offsetLeft;

      const fromTop = relativeY;
      const fromRight = offsetWidth - relativeX;
      const fromBottom = offsetHeight - relativeY;
      const fromLeft = relativeX;

      const minDistance = Math.min(
        fromTop,
        fromRight,
        fromBottom,
        fromLeft,
      );

      // if cursor is in the border, it should "catch" the box
      // if not, we should run spring physics
      if (minDistance <= BORDER) {
        const relativePos = [relativeX, relativeY];
        const center = [offsetWidth / 2, offsetHeight / 2];
        const toCenter = normalize(
          zipWith(center, relativePos, (a, b) => a - b)
        );

        setOffset(toCenter.map(n => n * minDistance) as [number, number]);
      }
    }
  }

  useEffect(() => {
    let frameId: number;
    let prevTime = 0;

    const animate = (currTime: number) => {
      const delta = currTime - prevTime;

      // apply spring physics
      // FIXME: do I need this?
      // if (!isMouseInBorder)
      setOffset(offset => {
        const length = magnitude(offset);
        const forceVal = length * STIFFNESS * delta;
        const direction = normalize(offset.map(n => -n));
        const force = direction.map(d => d * forceVal);
        velocity.current = velocity.current.map(v => v * DECAY) as [number, number];
        velocity.current = zipWith(velocity.current, force, (a, b) => a + b) as [number, number];

        if (length < 0.1 && magnitude(velocity.current) < 0.1) {
          velocity.current = [0, 0];

          return [0, 0];
        } else {
          return zipWith(offset, velocity.current, (a, b) => a + b) as [number, number];
        }
      })

      prevTime = currTime;
      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    }
  }, []);

  return (
    <div
      className="relative"
      ref={containerElement}
      onMouseMove={handleMouseMove}
    >
      <div
        style={{
          position: 'relative',
          left: offset[0],
          top: offset[1],
        }}
      >
        {children}
      </div>
    </div>
  )
}
