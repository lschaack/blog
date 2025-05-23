"use client";

import { FC, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { zipWith } from "lodash";
import clsx from "clsx";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import { doesLineIntersectRectangle } from "@/app/utils/doesLineIntersectRectangle";

const BORDER = 12;
const STIFFNESS = 0.002;
const DECAY = 0.95;
const ANIMATION_THRESHOLD = 0.001;

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
const negate = (n: number) => -n;
const multiplyBy = (by: number) => (n: number) => n * by;

const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;
// TODO: name this something more descriptive...
const asymmetricFilter = (v: number) => v < 0 ? v / 3 : v;

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
  const [offset, _setOffset] = useState<Vec2>([0, 0]);
  const [lerpedOffset, _setLerpedOffset] = useState<Vec2>([0, 0]);
  const containerElement = useRef<HTMLDivElement>(null);
  const velocity = useRef<Vec2>([0, 0]);
  const [doAnimate, setDoAnimate] = useState(false);
  const relativeMouseStart = useRef<Vec2 | null>(null);
  const isContained = useRef(false);

  const setOffset: typeof _setOffset = valueOrCallback => {
    _setOffset(prev => {
      const next = typeof valueOrCallback === 'function'
        ? valueOrCallback(prev)
        : valueOrCallback;

      _setLerpedOffset(
        zipWith(prev, next, (a, b) => lerp(a, b, 0.75)) as Vec2
      );

      return next;
    })
  }

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (containerElement.current) {
        const coords = getStableCoords(containerElement.current);
        const { pageX, pageY } = event;
        const currMousePos: Vec2 = [pageX, pageY];
        const prevMousePos: Vec2 = [pageX - event.movementX, pageY - event.movementY];
        const {
          intersects,
          startInside,
          endInside,
          intersectionPoints,
        } = doesLineIntersectRectangle(prevMousePos, currMousePos, coords);

        if (intersects) {
          if (endInside) {
            if (isPointInBorder(currMousePos, coords, BORDER)) {
              const { top, left } = coords;
              const relativePos: Vec2 = [pageX - left, pageY - top];
              const relativeIntersection: Vec2 = [
                intersectionPoints[0][0] - left,
                intersectionPoints[0][1] - top,
              ];
              // Track start point so we can use the inter-border vector to determine the offset
              relativeMouseStart.current ??= relativeIntersection;

              const fromStart = zipWith(relativePos, relativeMouseStart.current!, subtract) as Vec2;

              setOffset(fromStart)
              setDoAnimate(false);
            } else {
              if (startInside) {
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

        _setLerpedOffset([0, 0]);

        return [0, 0];
      } else {
        const nextOffset = zipWith(offset, velocity.current, add) as Vec2;

        return nextOffset;
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
        className="bg-blue-100 rounded-2xl absolute"
        style={{
          top: asymmetricFilter(lerpedOffset[1]),
          right: asymmetricFilter(-lerpedOffset[0]),
          bottom: asymmetricFilter(-lerpedOffset[1]),
          left: asymmetricFilter(lerpedOffset[0]),
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
