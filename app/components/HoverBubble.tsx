"use client";

import { FC, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
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
import { useResizeValue } from "@/app/hooks/useResizeValue";

const DEFAULT_BOUNDARY_WIDTH = 8;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.05;
const INITIAL_OFFSET_RANGE = 60;
const INSET_OPTIONS = {
  min: -INITIAL_OFFSET_RANGE,
  max: INITIAL_OFFSET_RANGE
};

const BUBBLE_ANIMATION_STRATEGY: 'inset' | 'transform' = 'transform';
const USE_TRANSFORM = BUBBLE_ANIMATION_STRATEGY as string === 'transform';

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
  uuid?: string;
}
export const HoverBubble: FC<HoverBubbleProps> = ({
  children,
  boundaryWidth: _boundaryWidth = DEFAULT_BOUNDARY_WIDTH,
  bubbleSluggishness: bubbleSluggishness = DEFAULT_OFFSET_LERP_AMOUNT,
  bubbleClassname: indicatorClassname,
  seed,
  uuid,
  moveOnMount = false,
}) => {
  const { debug } = useContext(DebugContext);

  const [doAnimate, setDoAnimate] = useState(moveOnMount);

  const physicsState = useRef<PhysicsState>(getInitialPhysicsState(moveOnMount, seed));
  const lerpedOffset = useRef<Vec2>([0, 0]);
  const impulses = useRef<Vec2[]>([]);
  const containerElement = useRef<HTMLDivElement>(null);
  const bubbleElement = useRef<HTMLDivElement>(null);
  const contentElement = useRef<HTMLDivElement>(null);
  const offsetIndicatorElement = useRef<HTMLDivElement>(null);
  const lerpedOffsetIndicatorElement = useRef<HTMLDivElement>(null);

  const overkill = useDebuggableValue('bubbleOverkill', BUBBLE_OVERKILL, true);
  const springStiffness = useDebuggableValue('springStiffness', SPRING_STIFFNESS, true);
  const boundaryWidth = useDebuggableValue('bubbleBorder', _boundaryWidth, true);
  const doubleBoundaryWidth = 2 * boundaryWidth;

  const bubbleOffsetWidth = useResizeValue(() => bubbleElement.current?.offsetWidth ?? 0, 0);
  const bubbleOffsetHeight = useResizeValue(() => bubbleElement.current?.offsetHeight ?? 0, 0);
  const bubbleOffsetTop = useResizeValue(() => bubbleElement.current?.offsetTop ?? 0, 0);
  const bubbleOffsetLeft = useResizeValue(() => bubbleElement.current?.offsetLeft ?? 0, 0);

  const containerOffsetWidth = useResizeValue(() => containerElement.current?.offsetWidth ?? 0, 0);
  const containerOffsetHeight = useResizeValue(() => containerElement.current?.offsetHeight ?? 0, 0);
  const containerOffsetTop = useResizeValue(() => containerElement.current?.offsetTop ?? 0, 0);
  const containerOffsetLeft = useResizeValue(() => containerElement.current?.offsetLeft ?? 0, 0);

  const updateStyles = useCallback(() => {
    performance.mark('update-styles-start')
    const effectiveOffset = physicsState.current.offset.map(x => x / 2) as Vec2;

    const bubbleTop = overkill * asymmetricFilter(lerpedOffset.current[1]) + physicsState.current.inset.top;
    const bubbleRight = overkill * asymmetricFilter(-lerpedOffset.current[0]) + physicsState.current.inset.right;
    const bubbleBottom = overkill * asymmetricFilter(-lerpedOffset.current[1]) + physicsState.current.inset.bottom;
    const bubbleLeft = overkill * asymmetricFilter(lerpedOffset.current[0]) + physicsState.current.inset.left;

    // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
    const clipX = bubbleLeft - effectiveOffset[0];
    const clipY = bubbleTop - effectiveOffset[1];
    const clipRounding = Math.max(32 - boundaryWidth, 0);

    const scaledBubbleWidth = bubbleOffsetWidth - bubbleLeft - bubbleRight;
    const scaledBubbleHeight = bubbleOffsetHeight - bubbleTop - bubbleBottom;

    const scaleX = scaledBubbleWidth / bubbleOffsetWidth;
    const scaleY = scaledBubbleHeight / bubbleOffsetHeight;
    const translateX = (bubbleLeft - bubbleRight) / 2;
    const translateY = (bubbleTop - bubbleBottom) / 2;

    const bubbleWidth = USE_TRANSFORM
      ? scaledBubbleWidth
      : bubbleOffsetWidth;
    const bubbleHeight = USE_TRANSFORM
      ? scaledBubbleHeight
      : bubbleOffsetHeight;

    const clipWidth = bubbleElement.current
      ? `${bubbleWidth - doubleBoundaryWidth}px`
      : '100%';
    const clipHeight = bubbleElement.current
      ? `${bubbleHeight - doubleBoundaryWidth}px`
      : '100%';

    performance.mark('setting-styles-start');
    if (bubbleElement.current) {
      if (USE_TRANSFORM) {
        bubbleElement.current.style.willChange = 'transform';
        bubbleElement.current.style.transform = `matrix(${scaleX}, 0, 0, ${scaleY}, ${translateX}, ${translateY})`;
      } else {
        bubbleElement.current.style.willChange = 'inset';
        bubbleElement.current.style.inset = `${bubbleTop}px ${bubbleRight}px ${bubbleBottom}px ${bubbleLeft}px`;
      }
    }

    if (contentElement.current) {
      contentElement.current.style.willChange = 'transform, clip-path';
      contentElement.current.style.clipPath = `xywh(${clipX}px ${clipY}px ${clipWidth} ${clipHeight} round ${clipRounding}px)`;
      contentElement.current.style.transform = `translate(${effectiveOffset[0]}px, ${effectiveOffset[1]}px)`;
    }

    if (offsetIndicatorElement.current) {
      offsetIndicatorElement.current.style.transform = `translate(${physicsState.current.offset[0]}px, ${physicsState.current.offset[1]}px)`;
    }

    if (lerpedOffsetIndicatorElement.current) {
      lerpedOffsetIndicatorElement.current.style.transform = `translate(${lerpedOffset.current[0]}px, ${lerpedOffset.current[1]}px)`;
    }
    performance.mark('setting-styles-end');
    performance.measure('setting-styles-duration', 'setting-styles-start', 'setting-styles-end');
    performance.mark('update-styles-end');
    performance.measure('update-styles-duration', 'update-styles-start', 'update-styles-end');
  }, [boundaryWidth, doubleBoundaryWidth, overkill, bubbleOffsetWidth, bubbleOffsetHeight]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      performance.mark('handler-start', { detail: { uuid } });

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

        // FIXME: Find a way to share these with updateStyles for a given cycle
        const bubbleTop = overkill * asymmetricFilter(lerpedOffset.current[1]) + physicsState.current.inset.top;
        const bubbleRight = overkill * asymmetricFilter(-lerpedOffset.current[0]) + physicsState.current.inset.right;
        const bubbleBottom = overkill * asymmetricFilter(-lerpedOffset.current[1]) + physicsState.current.inset.bottom;
        const bubbleLeft = overkill * asymmetricFilter(lerpedOffset.current[0]) + physicsState.current.inset.left;

        // get bubble scaleX, scaleY, translateX, translateY
        const scaledBubbleWidth = bubbleOffsetWidth - bubbleLeft - bubbleRight;
        const scaledBubbleHeight = bubbleOffsetHeight - bubbleTop - bubbleBottom;

        const bubbleWidth = USE_TRANSFORM
          ? scaledBubbleWidth
          : bubbleOffsetWidth;
        const bubbleHeight = USE_TRANSFORM
          ? scaledBubbleHeight
          : bubbleOffsetHeight;
        // FIXME: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        const outerRectangle: Rectangle = {
          x: containerOffsetLeft + bubbleLeft,
          y: containerOffsetTop + bubbleTop,
          width: bubbleWidth,
          height: bubbleHeight,
        }

        const innerRectangle: Rectangle = {
          x: outerRectangle.x + boundaryWidth,
          y: outerRectangle.y + boundaryWidth,
          width: outerRectangle.width - doubleBoundaryWidth,
          height: outerRectangle.height - doubleBoundaryWidth,
        }

        performance.mark('segment-finder-start', { detail: { uuid } });
        const intersectingSegments = findVectorSegmentsInShape(
          currMousePos,
          prevMousePos,
          new ShapeWithHole(outerRectangle, innerRectangle)
        );
        performance.mark('segment-finder-end', { detail: { uuid } });

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

          if (!doAnimate) setDoAnimate(true);
        }
      }

      performance.mark('handler-end', { detail: { uuid } });
      performance.measure('handler-duration', 'handler-start', 'handler-end');
      performance.measure('segment-finder-duration', 'segment-finder-start', 'segment-finder-end');
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [
    uuid,
    boundaryWidth,
    doubleBoundaryWidth,
    doAnimate,
    containerOffsetLeft,
    bubbleOffsetLeft,
    containerOffsetTop,
    bubbleOffsetTop,
    containerOffsetWidth,
    containerOffsetHeight,
    overkill,
    bubbleOffsetWidth,
    bubbleOffsetHeight
  ]);

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
      if (bubbleElement.current) bubbleElement.current.style.willChange = 'unset';
      if (contentElement.current) contentElement.current.style.willChange = 'unset';
      setDoAnimate(false);
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

    updateStyles();
  }, [bubbleSluggishness, seed, springStiffness, updateStyles]);

  useAnimationFrames(applySpringForce, doAnimate);

  return (
    <div
      ref={containerElement}
      className={clsx(
        "relative",
        // TODO: measure effect & test different values
        //"contain-layout",
        indicatorClassname,
      )}
      style={{ padding: `${boundaryWidth}px`, }}
    >
      {/* NOTE: Separate, absolutely-positioned bubble is necessary to allow separate values for
        * left/right, top/bottom, creating the particular bounciness of the bubble effect. */}
      <div
        ref={bubbleElement}
        className={clsx(
          "absolute rounded-4xl overflow-hidden",
          "transition-colors duration-500 ease-out",
          "inset-0",
          "bg-stone-300/25",
          doAnimate && debug && "bg-blue-300/75!",
        )}
      >
        <div className="absolute rounded-3xl bg-stone-50/95 mix-blend-lighten" style={{ inset: `${boundaryWidth}px` }} />
      </div>
      <div ref={contentElement} className="relative">
        {children}
      </div>
      {debug && (
        <div className="absolute rounded-full w-4 h-4 left-1/2 top-1/2 overflow-visible mix-blend-lighten bg-blue-300/100">
          <div ref={offsetIndicatorElement} className="absolute rounded-full w-4 h-4 contain-layout mix-blend-lighten bg-green-300/100" />
          <div ref={lerpedOffsetIndicatorElement} className="absolute rounded-full w-4 h-4 contain-layout mix-blend-lighten bg-red-300/100" />
        </div>
      )}
    </div>
  )
}
