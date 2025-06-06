"use client";

import { FC, ReactNode, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import clsx from "clsx";
import { add } from "lodash";

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
import { DebugContext } from "@/app/components/DebugContext";

const DEFAULT_BOUNDARY_WIDTH = 8;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.05;

// TODO: name this something more descriptive...
const asymmetricFilter = (v: number) => v < 0 ? v / 3 : v;

const getSpringForceVec = (offset: Vec2) => {
  const length = magnitude(offset);
  const forceVal = length * SPRING_STIFFNESS;
  const direction = normalize(offset.map(negate));
  const force = direction.map(multiplyBy(forceVal));

  return force as Vec2;
}

const getSpringForce = (length: number, target = 0) => {
  return (target - length) * SPRING_STIFFNESS;
}

const applyForcesVec = (velocity: Vec2, forces: Vec2[], delta: number) => {
  const decay = getDecay(delta);
  const force = multiplyVec(forces.reduce(addVec2), delta);

  const decayed = multiplyVec(velocity, decay);
  const applied = addVec2(decayed, force);

  return applied;
}

const applyForces = (velocity: number, forces: number[], delta: number) => {
  const decay = getDecay(delta);
  const force = forces.reduce(add) * delta;

  const decayed = velocity * decay;
  const applied = decayed + force;

  return applied;
}

type Inset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

type PhysicsState = {
  offset: Vec2;
  velocity: Vec2;
  inset: Inset;
  insetVelocity: Inset;
}

const getInitialPhysicsState = (): PhysicsState => ({
  offset: [0, 0],
  velocity: [0, 0],
  inset: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  insetVelocity: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

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
  const physicsState = useRef<PhysicsState>({
    offset: [0, 0],
    velocity: [0, 0],
    inset: {
      top: 20,
      right: 30,
      bottom: 15,
      left: 75,
    },
    insetVelocity: {
      top: -1,
      right: -1,
      bottom: -1,
      left: -1,
    }
  });
  const lerpedOffset = useRef<Vec2>([0, 0]);
  const impulses = useRef<Vec2[]>([]);
  const containerElement = useRef<HTMLDivElement>(null);
  const bubbleElement = useRef<HTMLDivElement>(null);
  const doubleBoundaryWidth = 2 * boundaryWidth;
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const doAnimate = (
    !physicsState.current.offset.every(component => component === 0)
    || impulses.current.length > 0
    || !Object.values(physicsState.current.insetVelocity).every(component => component === 0)
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (containerElement.current && bubbleElement.current) {
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
          x: containerElement.current.offsetLeft + bubbleElement.current.offsetLeft,
          y: containerElement.current.offsetTop + bubbleElement.current.offsetTop,
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
    // apply spring physicvelocitys
    const springForce = getSpringForceVec(physicsState.current.offset);

    impulses.current.push(springForce);

    physicsState.current.velocity = applyForcesVec(
      physicsState.current.velocity,
      impulses.current,
      delta
    );

    impulses.current = [];

    // apply spring physics to inset
    for (const property in physicsState.current.inset) {
      const key = property as keyof Inset; // TODO: this is stupid
      const springForce = getSpringForce(physicsState.current.inset[key]);

      physicsState.current.insetVelocity[key] = applyForces(
        physicsState.current.insetVelocity[key],
        [springForce],
        delta
      );

      physicsState.current.inset[key] += physicsState.current.insetVelocity[key];
    }

    // jump to still at low values or else this will basically never end
    const shouldStop = (
      Math.abs(magnitude(physicsState.current.velocity)) < VELOCITY_ANIMATION_THRESHOLD
      && physicsState.current.offset.every(component => Math.abs(component) < OFFSET_ANIMATION_THRESHOLD)
      && Object.values(physicsState.current.insetVelocity).every(component => Math.abs(component) < VELOCITY_ANIMATION_THRESHOLD)
    );

    if (shouldStop) {
      physicsState.current = getInitialPhysicsState();
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

  const bubbleTop = asymmetricFilter(lerpedOffset.current[1]) + physicsState.current.inset.top;
  const bubbleRight = asymmetricFilter(-lerpedOffset.current[0]) + physicsState.current.inset.right;
  const bubbleBottom = asymmetricFilter(-lerpedOffset.current[1]) + physicsState.current.inset.bottom;
  const bubbleLeft = asymmetricFilter(lerpedOffset.current[0]) + physicsState.current.inset.left;
  // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
  const clipX = bubbleLeft - physicsState.current.offset[0];
  const clipY = bubbleTop - physicsState.current.offset[1];
  const clipWidth = bubbleElement.current
    ? `${bubbleElement.current.offsetWidth - doubleBoundaryWidth}px`
    : '100%';
  const clipHeight = bubbleElement.current
    ? `${bubbleElement.current.offsetHeight - doubleBoundaryWidth}px`
    : '100%';
  const clipRounding = Math.max(32 - boundaryWidth, 0);

  return (
    <div
      ref={containerElement}
      className={clsx(
        "relative",
        indicatorClassname,
      )}
      style={{
        padding: `${boundaryWidth}px`,
      }}
    >
      {/* NOTE: Separate, absolutely-positioned bubble is necessary to allow separate values for
        * left/right, top/bottom, creating the particular bounciness of the bubble effect. */}
      <div
        ref={bubbleElement}
        className={clsx(
          "absolute",
          "bg-stone-50/80",
          "transition-colors duration-500 ease-out",
          showBubble ? "border-stone-900/30 rounded-4xl overflow-hidden" : "border-transparent",
          debug && doAnimate && "border-blue-200/75!",
        )}
        style={{
          borderWidth: `${boundaryWidth}px`,
          willChange: doAnimate ? 'inset' : 'unset',
          top: bubbleTop,
          right: bubbleRight,
          bottom: bubbleBottom,
          left: bubbleLeft,
        }}
      />
      <div
        style={{
          position: 'relative',
          clipPath: `xywh(${clipX}px ${clipY}px ${clipWidth} ${clipHeight} round ${clipRounding}px)`,
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
  )
}
