"use client";

import { FC, memo, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { SimpleFaker } from '@faker-js/faker';

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import {
  findVectorSegmentsInShape,
  Point,
  ShapeWithHole
} from "@/app/utils/findVectorSegmentsInShapeOptimized";
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
// TODO: I dunno if this memo is actually doing anything...
export const HoverBubble: FC<HoverBubbleProps> = memo(
  function HoverBubble({
    children,
    boundaryWidth: _boundaryWidth = DEFAULT_BOUNDARY_WIDTH,
    bubbleSluggishness: bubbleSluggishness = DEFAULT_OFFSET_LERP_AMOUNT,
    bubbleClassname: indicatorClassname,
    seed,
    uuid,
    moveOnMount = false,
  }) {
    const { debug } = useContext(DebugContext);
    // always start with at least one frame of animation to set clipPath
    const [doAnimate, setDoAnimate] = useState(true);

    const physicsState = useRef<PhysicsState>(getInitialPhysicsState(moveOnMount, seed));
    const lerpedOffset = useRef<Vec2>([0, 0]);
    const impulses = useRef<Vec2[]>([]);
    const containerElement = useRef<HTMLDivElement>(null);
    const bubbleElement = useRef<HTMLDivElement>(null);
    const contentElement = useRef<HTMLDivElement>(null);
    const offsetIndicatorElement = useRef<HTMLDivElement>(null);
    const lerpedOffsetIndicatorElement = useRef<HTMLDivElement>(null);

    const bubbleTop = useRef(0);
    const bubbleRight = useRef(0);
    const bubbleBottom = useRef(0);
    const bubbleLeft = useRef(0);

    const scaledBubbleWidth = useRef(0);
    const scaledBubbleHeight = useRef(0);

    const bubbleWidth = useRef(0);
    const bubbleHeight = useRef(0);

    const overkill = useDebuggableValue('bubbleOverkill', BUBBLE_OVERKILL, true);
    const springStiffness = useDebuggableValue('springStiffness', SPRING_STIFFNESS, true);
    const boundaryWidth = useDebuggableValue('bubbleBorder', _boundaryWidth, true);
    const doubleBoundaryWidth = 2 * boundaryWidth;

    const getBubbleOffsetWidth = useCallback(() => bubbleElement.current?.offsetWidth ?? 0, []);
    const getBubbleOffsetHeight = useCallback(() => bubbleElement.current?.offsetHeight ?? 0, []);
    const bubbleOffsetWidth = useResizeValue(getBubbleOffsetWidth, 0);
    const bubbleOffsetHeight = useResizeValue(getBubbleOffsetHeight, 0);

    const getContainerOffsetTop = useCallback(() => containerElement.current?.offsetTop ?? 0, []);
    const getContainerOffsetLeft = useCallback(() => containerElement.current?.offsetLeft ?? 0, []);
    const containerOffsetTop = useResizeValue(getContainerOffsetTop, 0);
    const containerOffsetLeft = useResizeValue(getContainerOffsetLeft, 0);

    const updateStyles = useCallback(() => {
      const {
        inset: {
          top,
          right,
          bottom,
          left,
        },
        offset: [
          offsetX,
          offsetY,
        ],
      } = physicsState.current;

      const [lerpedOffsetX, lerpedOffsetY] = lerpedOffset.current;

      // Avoid shifting the text content too much since it still needs to be readable
      const contentOffsetX = offsetX / 2;
      const contentOffsetY = offsetY / 2;

      bubbleTop.current = overkill * asymmetricFilter(lerpedOffsetY) + top;
      bubbleRight.current = overkill * asymmetricFilter(-lerpedOffsetX) + right;
      bubbleBottom.current = overkill * asymmetricFilter(-lerpedOffsetY) + bottom;
      bubbleLeft.current = overkill * asymmetricFilter(lerpedOffsetX) + left;

      scaledBubbleWidth.current = bubbleOffsetWidth - bubbleLeft.current - bubbleRight.current;
      scaledBubbleHeight.current = bubbleOffsetHeight - bubbleTop.current - bubbleBottom.current;

      bubbleWidth.current = USE_TRANSFORM
        ? scaledBubbleWidth.current
        : bubbleOffsetWidth;
      bubbleHeight.current = USE_TRANSFORM
        ? scaledBubbleHeight.current
        : bubbleOffsetHeight;

      // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
      const clipX = bubbleLeft.current - contentOffsetX;
      const clipY = bubbleTop.current - contentOffsetY;
      const clipRounding = Math.max(32 - boundaryWidth, 0);

      const scaleX = scaledBubbleWidth.current / bubbleOffsetWidth;
      const scaleY = scaledBubbleHeight.current / bubbleOffsetHeight;
      const translateX = (bubbleLeft.current - bubbleRight.current) / 2;
      const translateY = (bubbleTop.current - bubbleBottom.current) / 2;

      const clipWidth = bubbleElement.current
        ? `${bubbleWidth.current - doubleBoundaryWidth}px`
        : '100%';
      const clipHeight = bubbleElement.current
        ? `${bubbleHeight.current - doubleBoundaryWidth}px`
        : '100%';

      if (bubbleElement.current) {
        if (USE_TRANSFORM) {
          bubbleElement.current.style.transform = `matrix(${scaleX}, 0, 0, ${scaleY}, ${translateX}, ${translateY})`;
        } else {
          bubbleElement.current.style.inset = `${bubbleTop}px ${bubbleRight}px ${bubbleBottom}px ${bubbleLeft}px`;
        }
      }

      if (contentElement.current) {
        contentElement.current.style.clipPath = `xywh(${clipX}px ${clipY}px ${clipWidth} ${clipHeight} round ${clipRounding}px)`;
        contentElement.current.style.transform = `translate(${contentOffsetX}px, ${contentOffsetY}px)`;
      }

      if (offsetIndicatorElement.current) {
        offsetIndicatorElement.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      }

      if (lerpedOffsetIndicatorElement.current) {
        lerpedOffsetIndicatorElement.current.style.transform = `translate(${lerpedOffsetX}px, ${lerpedOffsetY}px)`;
      }
    }, [boundaryWidth, doubleBoundaryWidth, overkill, bubbleOffsetWidth, bubbleOffsetHeight]);

    useEffect(() => {
      const currMousePos: Point = { x: 0, y: 0 };
      const prevMousePos: Point = { x: 0, y: 0 };
      const outerRectangle = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
      const innerRectangle = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };

      const handleMouseMove = (event: MouseEvent) => {
        if (containerElement.current && bubbleElement.current) {
          const { pageX, pageY, movementX, movementY } = event;

          currMousePos.x = pageX;
          currMousePos.y = pageY;

          prevMousePos.x = pageX - movementX;
          prevMousePos.y = pageY - movementY;

          outerRectangle.x = containerOffsetLeft + bubbleLeft.current;
          outerRectangle.y = containerOffsetTop + bubbleTop.current;
          outerRectangle.width = bubbleWidth.current;
          outerRectangle.height = bubbleHeight.current;

          innerRectangle.x = outerRectangle.x + boundaryWidth;
          innerRectangle.y = outerRectangle.y + boundaryWidth;
          innerRectangle.width = outerRectangle.width - doubleBoundaryWidth;
          innerRectangle.height = outerRectangle.height - doubleBoundaryWidth;

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
            const clamped = clampVec(intersection, -doubleBoundaryWidth, doubleBoundaryWidth);
            const force = multiplyVec(clamped, BUBBLE_STIFFNESS);

            impulses.current.push(force);

            if (!doAnimate) setDoAnimate(true);
          }
        }
      };

      document.addEventListener('mousemove', handleMouseMove);

      return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [
      uuid,
      boundaryWidth,
      doubleBoundaryWidth,
      doAnimate,
      containerOffsetLeft,
      containerOffsetTop,
      overkill,
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

    useAnimationFrames(
      applySpringForce,
      // Offset values are always undefined on first render, and shouldn't be accessed directly
      // in applySpringForce since DOM property access is so slow. This avoids essentially all
      // animation frame cancellations, which are expensive during my ridiculous FakePostList
      // pop-in effect. Kinda weird, but makes a sizeable difference on slow CPUs
      doAnimate && Boolean(bubbleOffsetWidth) && Boolean(bubbleOffsetHeight)
    );

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
            doAnimate && "will-change-transform",
          )}
        >
          <div className="absolute rounded-3xl bg-stone-50/95 mix-blend-lighten" style={{ inset: `${boundaryWidth}px` }} />
        </div>
        <div
          ref={contentElement}
          className={clsx("relative", doAnimate && "will-change-transform")}
        >
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
);
