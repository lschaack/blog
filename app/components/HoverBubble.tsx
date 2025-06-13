"use client";

import { FC, ReactNode, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import clsx from "clsx";
import { SimpleFaker } from '@faker-js/faker';

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import {
  findVectorSegmentsInShape,
  Point,
  Rectangle,
  ShapeWithHole
} from "@/app/utils/findVectorSegmentsInShape";
import { lerp } from "@/app/utils/lerp";
import {
  VELOCITY_ANIMATION_THRESHOLD,
  BUBBLE_STIFFNESS,
  OFFSET_ANIMATION_THRESHOLD,
  BUBBLE_OVERKILL,
  SPRING_STIFFNESS,
  getSpringForceVec,
  applyForcesVec,
  getSpringForce,
  applyForces,
} from "@/app/utils/physicsConsts";
import {
  addVec2,
  clampVec,
  magnitude,
  multiplyVec,
  segmentToVec2,
  Vec2,
} from "@/app/utils/vector";
import { DebugContext } from "@/app/components/DebugContext";
import { useDebuggableValue } from "@/app/hooks/useDebuggableValue";
import { useForceRenderOnResize } from "@/app/hooks/useForceRenderOnResize";

const DEFAULT_BOUNDARY_WIDTH = 8;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.05;
const INITIAL_OFFSET_RANGE = 60;
const INSET_OPTIONS = {
  min: -INITIAL_OFFSET_RANGE,
  max: INITIAL_OFFSET_RANGE
};

// TODO: name this something more descriptive...
const asymmetricFilter = (v: number) => v < 0 ? v / 3 : v;

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

const getInitialPhysicsState = (randomize = false, seed?: number): PhysicsState => {
  const faker = new SimpleFaker({ seed });

  if (randomize) {
    return {
      offset: [
        faker.number.int(INSET_OPTIONS),
        faker.number.int(INSET_OPTIONS)
      ],
      velocity: [0, 0],
      inset: {
        top: faker.number.int(INSET_OPTIONS),
        right: faker.number.int(INSET_OPTIONS),
        bottom: faker.number.int(INSET_OPTIONS),
        left: faker.number.int(INSET_OPTIONS),
      },
      insetVelocity: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    }
  } else {
    return {
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
    }
  }
};

type HoverBubbleProps = {
  children?: ReactNode;
  boundaryWidth?: number;
  bubbleClassname?: boolean;
  bubbleSluggishness?: number;
  seed?: number;
  moveOnMount?: boolean;
}
export const HoverBubble: FC<HoverBubbleProps> = ({
  children,
  boundaryWidth: _boundaryWidth = DEFAULT_BOUNDARY_WIDTH,
  bubbleSluggishness: bubbleSluggishness = DEFAULT_OFFSET_LERP_AMOUNT,
  bubbleClassname: indicatorClassname,
  seed,
  moveOnMount = false,
}) => {
  useForceRenderOnResize(); // avoid weird offset w/extreme resizing, not really necessary
  const { debug } = useContext(DebugContext);
  const physicsState = useRef<PhysicsState>(getInitialPhysicsState(moveOnMount, seed));
  const lerpedOffset = useRef<Vec2>([0, 0]);
  const impulses = useRef<Vec2[]>([]);
  const containerElement = useRef<HTMLDivElement>(null);
  const bubbleElement = useRef<HTMLDivElement>(null);
  const overkill = useDebuggableValue('bubbleOverkill', BUBBLE_OVERKILL);
  const boundaryWidth = useDebuggableValue('bubbleBorder', _boundaryWidth);
  const springStiffness = useDebuggableValue('springStiffness', SPRING_STIFFNESS);
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
    // apply spring physics
    const springForce = getSpringForceVec(physicsState.current.offset, springStiffness);

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
      const springForce = getSpringForce(physicsState.current.inset[key], springStiffness);

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
      physicsState.current = getInitialPhysicsState(false, seed);
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
  }, [bubbleSluggishness, seed, springStiffness]);

  useAnimationFrames(applySpringForce, doAnimate);

  const effectiveOffset = physicsState.current.offset.map(x => x / 2) as Vec2;

  const bubbleTop = overkill * asymmetricFilter(lerpedOffset.current[1]) + physicsState.current.inset.top;
  const bubbleRight = overkill * asymmetricFilter(-lerpedOffset.current[0]) + physicsState.current.inset.right;
  const bubbleBottom = overkill * asymmetricFilter(-lerpedOffset.current[1]) + physicsState.current.inset.bottom;
  const bubbleLeft = overkill * asymmetricFilter(lerpedOffset.current[0]) + physicsState.current.inset.left;
  // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
  // FIXME: at max border, there are rare frames where the clipWidth and clipHeight seem to be slightly too large
  const clipX = bubbleLeft - effectiveOffset[0];
  const clipY = bubbleTop - effectiveOffset[1];
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
          "border-stone-900/30 rounded-4xl overflow-hidden",
          doAnimate && debug && "border-blue-200/75!",
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
        className="relative"
        style={{
          clipPath: `xywh(${clipX}px ${clipY}px ${clipWidth} ${clipHeight} round ${clipRounding}px)`,
          left: effectiveOffset[0],
          top: effectiveOffset[1],
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
