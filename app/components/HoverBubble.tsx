"use client";

import { FC, MouseEventHandler, ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { zipWith } from "lodash";
import clsx from "clsx";

const BORDER = 10;
const STIFFNESS = 0.005;
const DECAY = 0.95;
const ANIMATION_THRESHOLD = 0.01;

type Vec2 = [number, number];

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

const add = (a: number, b: number) => a + b;
const subtract = (a: number, b: number) => a - b;
const negate = (n: number) => -n;
const multiplyBy = (by: number) => (n: number) => n * by;

const getSpringForce = (offset: Vec2, delta: number) => {
  const length = magnitude(offset);
  const forceVal = length * STIFFNESS * delta;
  const direction = normalize(offset.map(negate));
  const force = direction.map(multiplyBy(forceVal));

  return force;
}

export const HoverBubble: FC<{ children?: ReactNode }> = ({ children }) => {
  const [offset, setOffset] = useState<Vec2>([0, 0]);
  const containerElement = useRef<HTMLDivElement>(null);
  const velocity = useRef<Vec2>([0, 0]);
  const [doAnimate, setDoAnimate] = useState(false);
  const relativeMouseStart = useRef<Vec2 | null>(null);
  const isContained = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (containerElement.current) {
        const {
          top: baseTop,
          right: baseRight,
          bottom: baseBottom,
          left: baseLeft,
        } = containerElement.current.getBoundingClientRect();

        const top = baseTop + document.documentElement.scrollTop;
        const right = baseRight + document.documentElement.scrollLeft;
        const bottom = baseBottom + document.documentElement.scrollTop;
        const left = baseLeft + document.documentElement.scrollLeft;

        const width = right - left;
        const height = bottom - top;

        const relativeY = event.pageY - top;
        const relativeX = event.pageX - left;

        const isCursorInContainer = (
          relativeX >= 0
          && relativeY >= 0
          && relativeX <= width
          && relativeY <= height
        );

        // FIXME: this should replicate current logic, but need to handle edge case where
        // cursor skips over the entire element
        if (isCursorInContainer) {
          // is the cursor in the border?
          // if so, pin offset to cursor
          // else, run physics as usual
          const fromTop = relativeY;
          const fromRight = width - relativeX;
          const fromBottom = height - relativeY;
          const fromLeft = relativeX;

          const minDistance = Math.min(
            fromTop,
            fromRight,
            fromBottom,
            fromLeft,
          );

          const isCursorInBorder = minDistance <= BORDER;

          if (isCursorInBorder) {
            const relativePos: Vec2 = [relativeX, relativeY];
            // Track start point so we can use the inter-border vector to determine the offset
            // Would ideally go next to setDoAnimate for clarity, but needed for fromStart
            relativeMouseStart.current ??= relativePos;

            const fromStart = normalize(
              zipWith(
                relativePos,
                relativeMouseStart.current!,
                subtract,
              )
            );

            if (isContained.current) {
              const distanceFromInnerEdge = BORDER - minDistance;
              const nextOffset = fromStart.map(multiplyBy(distanceFromInnerEdge)) as Vec2;

              if (nextOffset.some(isNaN)) debugger;

              setOffset(nextOffset);
            } else {
              const nextOffset = fromStart.map(multiplyBy(minDistance)) as Vec2;

              if (nextOffset.some(isNaN)) debugger;

              setOffset(nextOffset);
            }

            console.log('stop b/c in border')
            setDoAnimate(false);
          } else {
            relativeMouseStart.current = null;
            isContained.current = true;
            setDoAnimate(true);
          }
        } else {
          relativeMouseStart.current = null;
          isContained.current = false;
          setDoAnimate(true);
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (doAnimate) {
      let frameId: number;
      let prevTime: number;

      const animate = (currTime: number) => {
        const delta = prevTime ? currTime - prevTime : 16.67;

        // apply spring physics
        setOffset(offset => {
          const force = getSpringForce(offset, delta);

          velocity.current = velocity.current.map(multiplyBy(DECAY)) as Vec2;
          velocity.current = zipWith(velocity.current, force, add) as Vec2;

          // jump to still at low values or else this will basically never end
          if (length < ANIMATION_THRESHOLD && magnitude(velocity.current) < ANIMATION_THRESHOLD) {
            velocity.current = [0, 0];

            console.log('stop b/c done')
            setDoAnimate(false);

            return [0, 0];
          } else {
            return zipWith(offset, velocity.current, add) as Vec2;
          }
        })

        prevTime = currTime;
        frameId = requestAnimationFrame(animate);
      }

      frameId = requestAnimationFrame(animate);

      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      }
    }
  }, [doAnimate]);

  return (
    <div
      className={clsx(
        "relative",
        "border-4",
        doAnimate ? "border-emerald-300" : "border-transparent",
      )}
      style={{
        padding: `${BORDER}px`
      }}
      ref={containerElement}
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
