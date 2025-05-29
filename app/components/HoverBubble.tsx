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
import { ANIMATION_THRESHOLD, getDecay } from "@/app/utils/physicsConsts";
import {
  addVec2,
  clampVec,
  magnitude,
  multiplyBy,
  multiplyVec,
  negate,
  normalize,
  segmentToVec2,
  Vec2,
} from "@/app/utils/vector";

const DEFAULT_BOUNDARY_WIDTH = 8;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.65;
const SPRING_STIFFNESS = 0.01;
const BUBBLE_STIFFNESS = 0.1;

// TODO: name this something more descriptive...
const asymmetricFilter = (v: number) => v < 0 ? v / 3 : v;

const getSpringForce = (offset: Vec2) => {
  const length = magnitude(offset);
  const forceVal = length * SPRING_STIFFNESS;
  const direction = normalize(offset.map(negate));
  const force = direction.map(multiplyBy(forceVal));

  return force as Vec2;
}

const applyForces = (velocity: Vec2, forces: Vec2[], delta: number) => {
  const decayed = multiplyVec(velocity, getDecay(delta));
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
  const doubleBoundaryWidth = 2 * boundaryWidth;

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
          width: outerRectangle.width - doubleBoundaryWidth,
          height: outerRectangle.height - doubleBoundaryWidth,
        }

        const intersectingSegments = findVectorSegmentsInShape(
          currMousePos,
          prevMousePos,
          new ShapeWithHole(outerRectangle, innerRectangle)
        );

        if (intersectingSegments.length) {
          const intersection = intersectingSegments.reduce(
            (total, segment) => addVec2(total, segmentToVec2(segment)),
            [0, 0] as Vec2
          );

          const force = multiplyVec(
            // clamp to avoid excessive force when moving quickly through the boundary
            clampVec(intersection, -doubleBoundaryWidth, doubleBoundaryWidth),
            BUBBLE_STIFFNESS
          );

          setImpulses(prev => [...prev, force]);
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove);

    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [boundaryWidth, doubleBoundaryWidth]);

  const doAnimate = !offset.every(component => component === 0) || impulses.length > 0;

  const applySpringForce = useCallback((delta: number) => {
    // apply spring physics
    setImpulses(impulses => {
      setOffset(offset => {
        const springForce = getSpringForce(offset);
        velocity.current = applyForces(velocity.current, [...impulses, springForce], delta);

        // jump to still at low values or else this will basically never end
        const shouldStop = magnitude(velocity.current) < ANIMATION_THRESHOLD;

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
    <div ref={containerElement} className="relative">
      <div
        className={clsx(
          "bg-amber-50/80",
          "relative",
          "transition-colors duration-500 ease-out",
          showBubble ? "border-amber-900/30 rounded-4xl overflow-hidden" : "border-transparent",
          debug && doAnimate && "border-rose-200/75!",
          indicatorClassname,
        )}
        style={{
          borderWidth: `${boundaryWidth}px`,
          willChange: doAnimate ? "inset" : 'unset',
          top: asymmetricFilter(lerpedOffset[1]),
          right: asymmetricFilter(-lerpedOffset[0]),
          bottom: asymmetricFilter(-lerpedOffset[1]),
          left: asymmetricFilter(lerpedOffset[0]),
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
      {debug && (
        <div className="rounded-full w-2 h-2 bg-black absolute left-1/2 top-1/2 overflow-visible">
          <div
            className="rounded-full w-2 h-2 bg-rose-500 absolute"
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
    </div>
  )
}
