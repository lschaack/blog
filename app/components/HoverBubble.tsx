"use client";

import { FC, ReactNode, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import clsx from "clsx";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import {
  findVectorSegmentsInShape,
  Point,
  Rectangle,
  ShapeWithHole
} from "@/app/utils/findVectorSegmentsInShape";
import { lerp } from "@/app/utils/lerp";
import {
  getDecay,
  VELOCITY_ANIMATION_THRESHOLD,
  BUBBLE_STIFFNESS,
  SPRING_STIFFNESS,
  OFFSET_ANIMATION_THRESHOLD,
} from "@/app/utils/physicsConsts";
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
import { DebugContext } from "./DebugContext";

const DEFAULT_BOUNDARY_WIDTH = 8;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.05;

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
  const decay = getDecay(delta);
  const force = multiplyVec(forces.reduce(addVec2), delta);

  const decayed = multiplyVec(velocity, decay);
  const applied = addVec2(decayed, force);

  return applied;
}

type PhysicsState = {
  offset: Vec2;
  velocity: Vec2;
}

type HoverBubbleProps = {
  children?: ReactNode;
  boundaryWidth?: number;
  showBubble?: boolean;
  bubbleClassname?: boolean;
  bubbleSluggishness?: number;
}
export const HoverBubble: FC<HoverBubbleProps> = ({
  children,
  boundaryWidth = DEFAULT_BOUNDARY_WIDTH,
  bubbleSluggishness: bubbleSluggishness = DEFAULT_OFFSET_LERP_AMOUNT,
  showBubble = true,
  bubbleClassname: indicatorClassname,
}) => {
  const { debug } = useContext(DebugContext);
  const physicsState = useRef<PhysicsState>({ offset: [0, 0], velocity: [0, 0] });
  const lerpedOffset = useRef<Vec2>([0, 0]);
  const impulses = useRef<Vec2[]>([]);
  const containerElement = useRef<HTMLDivElement>(null);
  const doubleBoundaryWidth = 2 * boundaryWidth;
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const doAnimate = (
    !physicsState.current.offset.every(component => component === 0)
    || impulses.current.length > 0
  );

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
          // clamp to avoid excessive force when moving quickly through the boundary
          const clamped = clampVec(intersection, -doubleBoundaryWidth, doubleBoundaryWidth);
          const normed: Vec2 = [clamped[0] / window.innerWidth, clamped[1] / window.innerHeight];

          const force = multiplyVec(normed, BUBBLE_STIFFNESS);

          impulses.current.push(force);
          forceUpdate();
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [boundaryWidth, doubleBoundaryWidth]);

  const applySpringForce = useCallback((delta: number) => {
    // apply spring physics
    const springForce = getSpringForce(physicsState.current.offset);

    impulses.current.push(springForce);

    physicsState.current.velocity = applyForces(
      physicsState.current.velocity,
      impulses.current,
      delta
    );

    impulses.current = [];

    // jump to still at low values or else this will basically never end
    const shouldStop = (
      Math.abs(magnitude(physicsState.current.velocity)) < VELOCITY_ANIMATION_THRESHOLD
      && physicsState.current.offset.every(component => Math.abs(component) < OFFSET_ANIMATION_THRESHOLD)
    );

    if (shouldStop) {
      physicsState.current.velocity = [0, 0];
      physicsState.current.offset = [0, 0];
      lerpedOffset.current = [0, 0];
    } else {
      const nextOffset = addVec2(physicsState.current.offset, physicsState.current.velocity) as Vec2;

      physicsState.current.offset = nextOffset;
      lerpedOffset.current = lerpedOffset.current.map(
        (component, i) => lerp(
          component,
          physicsState.current.offset[i],
          bubbleSluggishness,
        )
      ) as Vec2;
    }

    forceUpdate();
  }, [bubbleSluggishness]);

  useAnimationFrames(applySpringForce, doAnimate);

  return (
    <div ref={containerElement} className="relative">
      <div
        className={clsx(
          "bg-stone-50/80",
          "relative",
          "transition-colors duration-500 ease-out",
          showBubble ? "border-stone-900/30 rounded-4xl overflow-hidden" : "border-transparent",
          debug && doAnimate && "border-blue-200/75!",
          indicatorClassname,
        )}
        style={{
          borderWidth: `${boundaryWidth}px`,
          willChange: doAnimate ? 'inset' : 'unset',
          top: asymmetricFilter(lerpedOffset.current[1]),
          right: asymmetricFilter(-lerpedOffset.current[0]),
          bottom: asymmetricFilter(-lerpedOffset.current[1]),
          left: asymmetricFilter(lerpedOffset.current[0]),
        }}
      >
        <div
          style={{
            position: 'relative',
            left: physicsState.current.offset[0],
            top: physicsState.current.offset[1],
          }}
        >
          {children}
        </div>
        {debug && (
          <div className="absolute rounded-full w-2 h-2 bg-black left-1/2 top-1/2 overflow-visible">
            <div
              className="absolute rounded-full w-2 h-2 bg-emerald-300"
              style={{
                left: physicsState.current.offset[0],
                top: physicsState.current.offset[1],
              }}
            />
            <div
              className="absolute rounded-full w-2 h-2 bg-rose-300"
              style={{
                left: lerpedOffset.current[0],
                top: lerpedOffset.current[1],
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
