"use client";

import { FC, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { zipWith } from "lodash";
import clsx from "clsx";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import {
  findVectorSegmentsInShape,
  Point,
  Rectangle,
  ShapeWithHole
} from "@/app/utils/findVectorSegmentsInShape";

const BORDER = 12;
const SPRING_STIFFNESS = 0.002;
const BUBBLE_STIFFNESS = 0.3;
const DECAY = 0.95;
const ANIMATION_THRESHOLD = 0.001;

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
const addVec2 = (a: Vec2, b: Vec2) => zipWith(a, b, add) as Vec2;
const negate = (n: number) => -n;
const multiplyBy = (by: number) => (n: number) => n * by;
const multiplyVec2 = (v: Vec2, by: number) => v.map(multiplyBy(by)) as Vec2;

const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;
// TODO: name this something more descriptive...
const asymmetricFilter = (v: number) => v < 0 ? v / 3 : v;

const getSpringForce = (offset: Vec2, delta: number) => {
  const length = magnitude(offset);
  const forceVal = length * SPRING_STIFFNESS * delta;
  const direction = normalize(offset.map(negate));
  const force = direction.map(multiplyBy(forceVal));

  return force as Vec2;
}

const applyForces = (velocity: Vec2, forces: Vec2[]) => {
  const decayed = velocity.map(multiplyBy(DECAY)) as Vec2;
  const applied = addVec2(decayed, forces.reduce(addVec2));

  return applied;
}

export const HoverBubble: FC<{ children?: ReactNode }> = ({ children }) => {
  const [offset, _setOffset] = useState<Vec2>([0, 0]);
  const [lerpedOffset, _setLerpedOffset] = useState<Vec2>([0, 0]);
  const containerElement = useRef<HTMLDivElement>(null);
  const velocity = useRef<Vec2>([0, 0]);
  const [doAnimate, setDoAnimate] = useState(false);
  const impulses = useRef<Vec2[]>([]);

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
        const { pageX, pageY } = event;

        const currMousePos: Point = {
          x: pageX,
          y: pageY
        };

        const prevMousePos: Point = {
          x: pageX - event.movementX,
          y: pageY - event.movementY
        };

        // TODO: does this account for scroll or different parent?
        const outerRectangle: Rectangle = {
          x: containerElement.current.offsetLeft,
          y: containerElement.current.offsetTop,
          width: containerElement.current.offsetWidth,
          height: containerElement.current.offsetHeight,
        }

        const innerRectangle: Rectangle = {
          x: outerRectangle.x + BORDER,
          y: outerRectangle.y + BORDER,
          width: outerRectangle.width - 2 * BORDER,
          height: outerRectangle.height - 2 * BORDER,
        }

        const intersectingSegments = findVectorSegmentsInShape(
          currMousePos,
          prevMousePos,
          new ShapeWithHole(outerRectangle, innerRectangle)
        );

        const force = intersectingSegments.reduce((force, segment) => {
          const segmentVector: Vec2 = [
            segment.start.x - segment.end.x,
            segment.start.y - segment.end.y,
          ];

          return addVec2(force, segmentVector) as Vec2;
        }, [0, 0] as Vec2);

        impulses.current.push(multiplyVec2(force, BUBBLE_STIFFNESS));
      }
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const applySpringForce = useCallback((delta: number) => {
    // apply spring physics
    setOffset(offset => {
      const springForce = getSpringForce(offset, delta);
      impulses.current.push(springForce);
      velocity.current = applyForces(velocity.current, impulses.current);
      impulses.current = [];

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
        const nextOffset = addVec2(offset, velocity.current) as Vec2;

        return nextOffset;
      }
    })
  }, []);

  useAnimationFrames(applySpringForce);

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
