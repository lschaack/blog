"use client";

import { FC, ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { zipWith } from "lodash";
import clsx from "clsx";
import { useAnimationFrames } from "../hooks/useAnimationFrames";
import { doesLineIntersectRectangle } from "../utils/doesLineIntersectRectangle";

const BORDER = 10;
const STIFFNESS = 0.005;
const DECAY = 0.95;
const ANIMATION_THRESHOLD = 0.01;

type Vec2 = [number, number];
type RectangleCoords = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

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
const multiply = (a: number, b: number) => a * b;
const dotProduct = (a: Vec2, b: Vec2) => zipWith(a, b, multiply);
const negate = (n: number) => -n;
const multiplyBy = (by: number) => (n: number) => n * by;

const getSpringForce = (offset: Vec2, delta: number) => {
  const length = magnitude(offset);
  const forceVal = length * STIFFNESS * delta;
  const direction = normalize(offset.map(negate));
  const force = direction.map(multiplyBy(forceVal));

  return force as Vec2;
}

const applyForces = (velocity: Vec2, force: Vec2) => {
  const decayed = velocity.map(multiplyBy(DECAY)) as Vec2;
  const applied = zipWith(decayed, force, add) as Vec2;

  return applied;
}

const getStableCoords = (element: HTMLElement): RectangleCoords => {
  const {
    top: baseTop,
    right: baseRight,
    bottom: baseBottom,
    left: baseLeft,
  } = element.getBoundingClientRect();

  const top = baseTop + document.documentElement.scrollTop;
  const right = baseRight + document.documentElement.scrollLeft;
  const bottom = baseBottom + document.documentElement.scrollTop;
  const left = baseLeft + document.documentElement.scrollLeft;

  return { top, right, bottom, left };
}

const isPointContained = (point: Vec2, coords: RectangleCoords) => {
  const { top, right, bottom, left } = coords;
  const [x, y] = point;

  return (
    x >= left && x <= right
    && y >= top && y <= bottom
  );
}

const isPointInBorder = (point: Vec2, coords: RectangleCoords, border: number) => {
  const { top, right, bottom, left } = coords;
  const [x, y] = point;

  const fromTop = y - top;
  const fromRight = right - x;
  const fromBottom = bottom - y;
  const fromLeft = x - left;

  const minDistance = Math.min(fromTop, fromRight, fromBottom, fromLeft);

  return minDistance <= border;
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
        const coords = getStableCoords(containerElement.current);
        const { pageX, pageY } = event;
        const currMousePos: Vec2 = [pageX, pageY];
        const prevMousePos: Vec2 = [pageX - event.movementX, pageY - event.movementY];
        const intersectionResult = doesLineIntersectRectangle(prevMousePos, currMousePos, coords);

        if (intersectionResult.intersects) {
          if (intersectionResult.endInside) {
            if (isPointInBorder(currMousePos, coords, BORDER)) {
              const { top, left } = coords;
              const relativePos: Vec2 = [pageX - left, pageY - top];
              // Track start point so we can use the inter-border vector to determine the offset
              relativeMouseStart.current ??= relativePos;

              const fromStart = zipWith(relativePos, relativeMouseStart.current!, subtract) as Vec2;

              setOffset(fromStart)

              setDoAnimate(false);
            } else {
              if (intersectionResult.startInside) {
                relativeMouseStart.current = null;
                isContained.current = true;
                setDoAnimate(true);
              } else {
                // if cursor skipped through the border, apply offset all at once
                const cursorMovement = zipWith(currMousePos, prevMousePos, subtract);
                const cursorDirection = normalize(cursorMovement);
                const cursorVelocity = magnitude(cursorMovement);

                setOffset(cursorDirection.map(multiplyBy(Math.min(cursorVelocity, BORDER))) as Vec2);
              }
            }
          } else {
            relativeMouseStart.current = null;
            isContained.current = false;
            setDoAnimate(true);
          }
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const applySpringForce = useCallback((delta: number) => {
    // apply spring physics
    setOffset(offset => {
      const force = getSpringForce(offset, delta);
      velocity.current = applyForces(velocity.current, force);

      // jump to still at low values or else this will basically never end
      const shouldStop = (
        length < ANIMATION_THRESHOLD
        && magnitude(velocity.current) < ANIMATION_THRESHOLD
      );

      if (shouldStop) {
        velocity.current = [0, 0];

        setDoAnimate(false);

        return [0, 0];
      } else {
        return zipWith(offset, velocity.current, add) as Vec2;
      }
    })
  }, []);

  useAnimationFrames(applySpringForce, doAnimate);

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
    >
      <div
        className="bg-cyan-100 rounded-2xl absolute"
        style={{
          top: Math.max(offset[1], 0),
          right: Math.abs(Math.min(offset[0], 0)),
          bottom: Math.abs(Math.min(offset[1], 0)),
          left: Math.max(offset[0], 0),
        }}
      />
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
