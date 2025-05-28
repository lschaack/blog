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
import { lerp } from "@/app/utils/lerp";

const DEFAULT_BOUNDARY_WIDTH = 8;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.65;
const SPRING_STIFFNESS = 0.001;
const BUBBLE_STIFFNESS = 0.05;
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

type HoverBubbleProps = {
  children?: ReactNode;
  boundaryWidth?: number;
  showBubble?: boolean;
  bubbleClassname?: boolean;
  bubbleSluggishness?: number;
  debug?: boolean;
}
export const HoverBubble: FC<HoverBubbleProps> = ({
  children,
  boundaryWidth = DEFAULT_BOUNDARY_WIDTH,
  bubbleSluggishness: bubbleSluggishness = DEFAULT_OFFSET_LERP_AMOUNT,
  showBubble = true,
  bubbleClassname: indicatorClassname,
  debug = false,
}) => {
  const [offset, _setOffset] = useState<Vec2>([0, 0]);
  const [impulses, setImpulses] = useState<Vec2[]>([]);
  const [lerpedOffset, _setLerpedOffset] = useState<Vec2>([0, 0]);
  const containerElement = useRef<HTMLDivElement>(null);
  const velocity = useRef<Vec2>([0, 0]);

  const setOffset: typeof _setOffset = valueOrCallback => {
    _setOffset(prev => {
      const next = typeof valueOrCallback === 'function'
        ? valueOrCallback(prev)
        : valueOrCallback;

      _setLerpedOffset(
        zipWith(lerpedOffset, next, (a, b) => lerp(a, b, bubbleSluggishness)) as Vec2
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
          x: outerRectangle.x + boundaryWidth,
          y: outerRectangle.y + boundaryWidth,
          width: outerRectangle.width - 2 * boundaryWidth,
          height: outerRectangle.height - 2 * boundaryWidth,
        }

        const intersectingSegments = findVectorSegmentsInShape(
          currMousePos,
          prevMousePos,
          new ShapeWithHole(outerRectangle, innerRectangle)
        );

        if (intersectingSegments.length) {
          const force = multiplyVec2(
            intersectingSegments.reduce((force, segment) => {
              const segmentVector: Vec2 = [
                segment.start.x - segment.end.x,
                segment.start.y - segment.end.y,
              ];

              return addVec2(force, segmentVector) as Vec2;
            }, [0, 0]),
            BUBBLE_STIFFNESS
          );

          setImpulses(prev => [...prev, force]);
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [boundaryWidth]);

  const doAnimate = !offset.every(component => component === 0) || impulses.length > 0;

  const applySpringForce = useCallback((delta: number) => {
    // apply spring physics
    setImpulses(impulses => {
      setOffset(offset => {
        const springForce = getSpringForce(offset, delta);
        velocity.current = applyForces(velocity.current, [...impulses, springForce]);

        // jump to still at low values or else this will basically never end
        const shouldStop = (
          length < ANIMATION_THRESHOLD
          && magnitude(velocity.current) < ANIMATION_THRESHOLD
        );

        if (shouldStop) {
          velocity.current = [0, 0];
          _setLerpedOffset([0, 0]);

          return [0, 0];
        } else {
          const nextOffset = addVec2(offset, velocity.current) as Vec2;

          return nextOffset;
        }
      });

      // impulses are always consumed entirely when setting offset,
      // but the callback allows me to use the most recent impulses without
      // adding `impulses` as a dependency to this callback, which results
      // in the animation constantly being stopped and restarted
      //
      // NOTE: this is react abuse afaik - if you're reading this and you
      // happen to know a way around this pattern, let me know
      return [];
    })
  }, [doAnimate]); // eslint-disable-line react-hooks/exhaustive-deps

  useAnimationFrames(applySpringForce, doAnimate);

  return (
    <div
      className={clsx(
        "relative",
        debug && "border-4",
        doAnimate ? "border-emerald-300" : "border-transparent",
      )}
      style={{
        padding: `${boundaryWidth}px`
      }}
      ref={containerElement}
    >
      {showBubble && (
        <div
          className={clsx(
            "bg-blue-50 border-blue-200 rounded-4xl",
            indicatorClassname,
            "absolute"
          )}
          style={{
            borderWidth: `${boundaryWidth}px`,
            top: asymmetricFilter(lerpedOffset[1]),
            right: asymmetricFilter(-lerpedOffset[0]),
            bottom: asymmetricFilter(-lerpedOffset[1]),
            left: asymmetricFilter(lerpedOffset[0]),
          }}
        />
      )}
      {debug && (
        <div className="rounded-full w-2 h-2 bg-black absolute left-1/2 top-1/2 overflow-visible">
          <div
            className="rounded-full w-2 h-2 bg-amber-500 absolute"
            style={{
              left: lerpedOffset[0],
              top: lerpedOffset[1],
            }}
          />
          <div
            className="rounded-full w-2 h-2 bg-emerald-500 absolute"
            style={{
              left: offset[0],
              top: offset[1],
            }}
          />
        </div>
      )}
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
