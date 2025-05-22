"use client";

import { FC, MouseEventHandler, ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { zipWith } from "lodash";
import clsx from "clsx";

const BORDER = 10
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

export const HoverBubble: FC<{ children?: ReactNode }> = ({ children }) => {
  const [offset, setOffset] = useState<Vec2>([0, 0]);
  const [isContained, setIsContained] = useState(false);
  const containerElement = useRef<HTMLDivElement>(null);
  const velocity = useRef<Vec2>([0, 0]);
  const [doAnimate, setDoAnimate] = useState(false);

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
        const center = [offsetWidth / 2, offsetHeight / 2];
        const toCenter = normalize(
          zipWith(center, relativePos, (a, b) => a - b)
        );

        if (isContained) {
          const fromCenter = toCenter.map(n => -n);
          const distanceFromInnerEdge = BORDER - minDistance;
          setOffset(fromCenter.map(n => n * distanceFromInnerEdge) as [number, number])
        } else {
          setOffset(toCenter.map(n => n * minDistance) as [number, number]);
        }
      } else {
        setIsContained(true);
        setDoAnimate(true);
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
          const direction = normalize(offset.map(n => -n));
          const force = direction.map(d => d * forceVal);
          velocity.current = velocity.current.map(v => v * DECAY) as Vec2;
          velocity.current = zipWith(velocity.current, force, (a, b) => a + b) as Vec2;

          // jump to still at low values or else this will basically never end
          if (length < ANIMATION_THRESHOLD && magnitude(velocity.current) < ANIMATION_THRESHOLD) {
            velocity.current = [0, 0];

            setDoAnimate(false);

            return [0, 0];
          } else {
            return zipWith(offset, velocity.current, (a, b) => a + b) as Vec2;
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
