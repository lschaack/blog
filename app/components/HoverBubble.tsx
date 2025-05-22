"use client";

import { FC, MouseEventHandler, ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { zipWith } from "lodash";
import clsx from "clsx";

const BORDER = 10;
const STIFFNESS = 0.005;
const DECAY = 0.95;
const ANIMATION_THRESHOLD = 0.1;

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

export const HoverBubble: FC<{ children?: ReactNode }> = ({ children }) => {
  const [offset, setOffset] = useState<Vec2>([0, 0]);
  const [isContained, setIsContained] = useState(false);
  const containerElement = useRef<HTMLDivElement>(null);
  const velocity = useRef<Vec2>([0, 0]);
  const [doAnimate, setDoAnimate] = useState(false);
  const relativeMouseStart = useRef<Vec2 | null>(null);

  const handleMouseMove: MouseEventHandler = useCallback(event => {
    if (containerElement.current) {
      const {
        offsetTop,
        offsetLeft,
        offsetWidth,
        offsetHeight,
      } = containerElement.current;

      const relativeY = event.pageY - offsetTop;
      const relativeX = event.pageX - offsetLeft;

      if (relativeMouseStart.current === null) relativeMouseStart.current = [relativeX, relativeY];

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
        setDoAnimate(false);

        const relativePos = [relativeX, relativeY];

        const fromStart = normalize(
          zipWith(
            relativePos,
            relativeMouseStart.current!,
            subtract,
          )
        );

        if (isContained) {
          const distanceFromInnerEdge = BORDER - minDistance;
          setOffset(fromStart.map(multiplyBy(distanceFromInnerEdge)) as Vec2)
        } else {
          setOffset(fromStart.map(multiplyBy(minDistance)) as Vec2)
        }
      } else {
        setIsContained(true);
        setDoAnimate(true);
        relativeMouseStart.current = null;
      }
    }
  }, [isContained]);

  useEffect(() => {
    if (doAnimate) {
      let frameId: number;
      let prevTime: number;

      const animate = (currTime: number) => {
        const delta = prevTime ? currTime - prevTime : 0;

        // apply spring physics
        setOffset(offset => {
          const length = magnitude(offset);
          const forceVal = length * STIFFNESS * delta;
          const direction = normalize(offset.map(negate));
          const force = direction.map(multiplyBy(forceVal));
          velocity.current = velocity.current.map(multiplyBy(DECAY)) as Vec2;
          velocity.current = zipWith(velocity.current, force, add) as Vec2;

          // jump to still at low values or else this will basically never end
          if (length < ANIMATION_THRESHOLD && magnitude(velocity.current) < ANIMATION_THRESHOLD) {
            velocity.current = [0, 0];

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
        "bg-neutral-100 rounded-lg",
        //"border-4",
        doAnimate ? "border-emerald-300" : "border-transparent",
      )}
      style={{
        padding: `${BORDER}px`
      }}
      ref={containerElement}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsContained(false);
        relativeMouseStart.current = null;
        setDoAnimate(true);
      }}
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
