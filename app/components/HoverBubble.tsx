"use client";

import { FC, memo, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { SimpleFaker } from "@faker-js/faker";
import { zipWith } from "lodash";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import {
  findVectorSegmentsInRoundedShape,
  Point,
  RoundedRectangle,
  RoundedShapeWithHole,
} from "@/app/utils/findVectorSegmentsInShape";
import { lerp } from "@/app/utils/lerp";
import {
  VELOCITY_ANIMATION_THRESHOLD,
  BUBBLE_STIFFNESS,
  OFFSET_ANIMATION_THRESHOLD,
  BUBBLE_OVERKILL,
  SPRING_STIFFNESS,
  getSpringForceVec2,
  getDecay,
  BUBBLE_BOUNDARY,
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
import { useIsVisible } from "@/app/hooks/useIsVisible";

const faker = new SimpleFaker();

const DEFAULT_ROUNDING = 24;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.05;
const INDICATOR_AMPLIFICATION = 2;
const INITIAL_OFFSET_RANGE = 60;
const INSET_OPTIONS = {
  min: -INITIAL_OFFSET_RANGE,
  max: INITIAL_OFFSET_RANGE
};

const INIT_DOM_MEASUREMENTS = {
  bubbleOffsetWidth: 0,
  bubbleOffsetHeight: 0,
  containerOffsetTop: 0,
  containerOffsetLeft: 0,
}

// TODO: name this something more descriptive...
const asymmetricFilter = (v: number) => v < 0 ? v / 3 : v;

type PhysicsState = {
  offset: Vec2;
  lerpedOffset: Vec2;
  velocity: Vec2;
}

type Inset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

type BubbleMeta = Inset & {
  width: number;
  height: number;
}

const getInitialPhysicsState = (randomize = false, seed?: number): PhysicsState => {
  if (randomize) {
    if (seed) faker.seed(seed);

    return {
      offset: [
        faker.number.int(INSET_OPTIONS),
        faker.number.int(INSET_OPTIONS)
      ],
      lerpedOffset: [
        faker.number.int(INSET_OPTIONS),
        faker.number.int(INSET_OPTIONS)
      ],
      velocity: [0, 0],
    }
  } else {
    return {
      offset: [0, 0],
      lerpedOffset: [0, 0],
      velocity: [0, 0],
    }
  }
};

export const consumeForces = (velocity: Vec2, forces: Vec2[], delta: number) => {
  const decay = getDecay(delta);

  const totalForce: Vec2 = [0, 0];
  while (forces.length) {
    const [x, y] = forces.pop()!;
    totalForce[0] += x;
    totalForce[1] += y;
  }
  const integratedForce = multiplyVec(totalForce, delta);

  const decayed = multiplyVec(velocity, decay);
  const applied = addVec2(decayed, integratedForce);

  return applied;
}

type HoverBubbleProps = {
  children?: ReactNode;
  boundary?: number;
  rounding?: number;
  sluggishness?: number;
  seed?: number;
  moveOnMount?: boolean;
  uuid?: string;
  className?: string;
  bubbleClassname?: string;
  innerBubbleClassname?: string;
  insetFilter?: (direction: number) => number;
  // TODO: This property is pretty hacked together for the demos
  showIndicators?: boolean;
}
export const HoverBubble: FC<HoverBubbleProps> = memo(
  function HoverBubble({
    children,
    boundary: _boundary = BUBBLE_BOUNDARY,
    rounding = DEFAULT_ROUNDING,
    sluggishness = DEFAULT_OFFSET_LERP_AMOUNT,
    seed,
    uuid,
    moveOnMount = false,
    className,
    bubbleClassname,
    innerBubbleClassname,
    insetFilter = asymmetricFilter,
    showIndicators = false,
  }) {
    const { debug } = useContext(DebugContext);

    const overkill = useDebuggableValue('bubbleOverkill', BUBBLE_OVERKILL, true);
    const springStiffness = useDebuggableValue('springStiffness', SPRING_STIFFNESS, true);
    const boundary = useDebuggableValue('bubbleBoundary', _boundary, true);
    const doubleBoundary = 2 * boundary;

    // always start with at least one frame of animation to set clipPath
    const [isUpdatePending, setIsUpdatePending] = useState(true);
    const isVisible = useIsVisible();

    const containerElement = useRef<HTMLDivElement>(null);
    const bubbleElement = useRef<HTMLDivElement>(null);
    const contentElement = useRef<HTMLDivElement>(null);
    const offsetIndicatorElement = useRef<HTMLDivElement>(null);
    const lerpedOffsetIndicatorElement = useRef<HTMLDivElement>(null);

    const physicsState = useRef<PhysicsState>(getInitialPhysicsState(moveOnMount, seed));
    const impulses = useRef<Vec2[]>([]);
    const bubbleMeta = useRef<BubbleMeta>({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
    })

    const updateDomMeasurements = useCallback(() => ({
      bubbleOffsetWidth: bubbleElement.current?.offsetWidth ?? 0,
      bubbleOffsetHeight: bubbleElement.current?.offsetHeight ?? 0,
      containerOffsetTop: containerElement.current?.offsetTop ?? 0,
      containerOffsetLeft: containerElement.current?.offsetLeft ?? 0,
    }), []);

    const getElementsToObserve = useCallback(() => [
      containerElement.current?.parentElement,
      window?.document.documentElement
    ], []);

    const {
      bubbleOffsetWidth,
      bubbleOffsetHeight,
      containerOffsetTop,
      containerOffsetLeft,
    } = useResizeValue(
      updateDomMeasurements,
      INIT_DOM_MEASUREMENTS,
      getElementsToObserve,
      50,
    );

    const updateStyles = useCallback(() => {
      const {
        offset: [
          offsetX,
          offsetY,
        ],
        lerpedOffset: [
          lerpedOffsetX,
          lerpedOffsetY
        ],
      } = physicsState.current;

      const {
        top: bubbleTop,
        right: bubbleRight,
        bottom: bubbleBottom,
        left: bubbleLeft,
        width: bubbleWidth,
        height: bubbleHeight,
      } = bubbleMeta.current;

      const scaleX = bubbleWidth / bubbleOffsetWidth;
      const scaleY = bubbleHeight / bubbleOffsetHeight;
      const translateX = (bubbleLeft - bubbleRight) / 2;
      const translateY = (bubbleTop - bubbleBottom) / 2;

      if (bubbleElement.current) {
        bubbleElement.current.style.transform = `matrix(${scaleX}, 0, 0, ${scaleY}, ${translateX}, ${translateY})`;
      }

      if (contentElement.current) {
        // Avoid shifting the text content too much since it still needs to be readable
        const contentOffsetX = offsetX / 2;
        const contentOffsetY = offsetY / 2;

        const distortionX = scaleX - 1;
        const distortionY = scaleY - 1;
        const scaleAvg = (scaleX + scaleY) / 2;

        // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
        const clipX = bubbleLeft - contentOffsetX + boundary * distortionX;
        const clipY = bubbleTop - contentOffsetY + boundary * distortionY;
        const clipWidth = Math.max(bubbleWidth - doubleBoundary * scaleX, 0);
        const clipHeight = Math.max(bubbleHeight - doubleBoundary * scaleY, 0);
        const clipRounding = rounding * scaleAvg;

        contentElement.current.style.clipPath = `xywh(${clipX}px ${clipY}px ${clipWidth}px ${clipHeight}px round ${clipRounding}px)`;
        contentElement.current.style.transform = `translate(${contentOffsetX}px, ${contentOffsetY}px)`;
      }

      if (offsetIndicatorElement.current) {
        offsetIndicatorElement.current.style.transform = `translate(${offsetX * INDICATOR_AMPLIFICATION}px, ${offsetY * INDICATOR_AMPLIFICATION}px)`;
      }

      if (lerpedOffsetIndicatorElement.current) {
        lerpedOffsetIndicatorElement.current.style.transform = `translate(${lerpedOffsetX * INDICATOR_AMPLIFICATION}px, ${lerpedOffsetY * INDICATOR_AMPLIFICATION}px)`;
      }
    }, [bubbleOffsetWidth, bubbleOffsetHeight, doubleBoundary, rounding, boundary]);

    useEffect(() => {
      const currMousePos: Point = { x: 0, y: 0 };
      const prevMousePos: Point = { x: 0, y: 0 };
      const outerRectangle: RoundedRectangle = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        radius: 0,
      };
      const innerRectangle: RoundedRectangle = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        radius: 0,
      };

      const handleMouseMove = (event: MouseEvent) => {
        const { pageX, pageY, movementX, movementY } = event;

        currMousePos.x = pageX;
        currMousePos.y = pageY;

        prevMousePos.x = pageX - movementX;
        prevMousePos.y = pageY - movementY;

        const {
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
          height: bubbleHeight,
        } = bubbleMeta.current;

        outerRectangle.x = containerOffsetLeft + bubbleLeft;
        outerRectangle.y = containerOffsetTop + bubbleTop;
        outerRectangle.width = bubbleWidth;
        outerRectangle.height = bubbleHeight;
        outerRectangle.radius = rounding + boundary;

        innerRectangle.x = outerRectangle.x + boundary;
        innerRectangle.y = outerRectangle.y + boundary;
        innerRectangle.width = outerRectangle.width - doubleBoundary;
        innerRectangle.height = outerRectangle.height - doubleBoundary;
        innerRectangle.radius = rounding;

        const intersectingSegments = findVectorSegmentsInRoundedShape(
          currMousePos,
          prevMousePos,
          new RoundedShapeWithHole(outerRectangle, innerRectangle)
        );

        if (intersectingSegments.length) {
          const intersection = intersectingSegments.reduce(
            (total, segment) => addVec2(total, segmentToVec2(segment)),
            [0, 0] as Vec2
          );
          // Minimize literal edge case where moving perfectly along the boundary causes
          // an absolutely massive force to be imparted on the bubble. This is essentially
          // true to the idealized physics, but it definitely looks wrong
          const clamped = clampVec(intersection, -doubleBoundary, doubleBoundary);
          const force = multiplyVec(clamped, BUBBLE_STIFFNESS);

          impulses.current.push(force);

          if (!isUpdatePending) setIsUpdatePending(true);
        }
      };

      document.addEventListener('mousemove', handleMouseMove);

      return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [
      uuid,
      boundary,
      doubleBoundary,
      isUpdatePending,
      containerOffsetLeft,
      containerOffsetTop,
      overkill,
      rounding
    ]);

    const updatePhysicsState = useCallback((delta: number) => {
      // apply spring physics
      const springForce = getSpringForceVec2(physicsState.current.offset, springStiffness);

      impulses.current.push(springForce);

      physicsState.current.velocity = consumeForces(
        physicsState.current.velocity,
        impulses.current,
        delta
      );

      // jump to still at low values or else this will basically never end
      const shouldStop = (
        Math.abs(magnitude(physicsState.current.velocity)) < VELOCITY_ANIMATION_THRESHOLD
        && physicsState.current.offset.every(component => Math.abs(component) < OFFSET_ANIMATION_THRESHOLD)
      );

      if (shouldStop) {
        setIsUpdatePending(false);
        physicsState.current = getInitialPhysicsState();
      } else {
        const nextOffset = addVec2(physicsState.current.offset, physicsState.current.velocity) as Vec2;
        const nextLerpedOffset = zipWith(
          physicsState.current.lerpedOffset,
          physicsState.current.offset,
          (a, b) => lerp(a, b, sluggishness)
        ) as Vec2;

        physicsState.current.offset = nextOffset;
        physicsState.current.lerpedOffset = nextLerpedOffset;
      }
    }, [sluggishness, springStiffness]);

    const updateBubbleMeta = useCallback(() => {
      const [lerpedOffsetX, lerpedOffsetY] = physicsState.current.lerpedOffset;

      const nextTop = overkill * insetFilter(lerpedOffsetY);
      const nextRight = overkill * insetFilter(-lerpedOffsetX);
      const nextBottom = overkill * insetFilter(-lerpedOffsetY);
      const nextLeft = overkill * insetFilter(lerpedOffsetX);

      bubbleMeta.current.top = nextTop;
      bubbleMeta.current.right = nextRight;
      bubbleMeta.current.bottom = nextBottom;
      bubbleMeta.current.left = nextLeft;

      bubbleMeta.current.width = bubbleOffsetWidth - nextLeft - nextRight;
      bubbleMeta.current.height = bubbleOffsetHeight - nextTop - nextBottom;

    }, [bubbleOffsetHeight, bubbleOffsetWidth, insetFilter, overkill]);

    // NOTE: All ref state updates are performed in their corresponding update_ method
    const update = useCallback((delta: number) => {
      updatePhysicsState(delta);
      updateBubbleMeta();
      updateStyles();
    }, [updatePhysicsState, updateBubbleMeta, updateStyles]);

    // Offset values are always undefined on first render, and shouldn't be accessed directly
    // in applySpringForce since DOM property access is so slow. This avoids essentially all
    // animation frame cancellations, which are expensive during my ridiculous FakePostList
    // pop-in effect. Kinda weird, but makes a sizeable difference on slow CPUs
    const doAnimate = isUpdatePending && Boolean(bubbleOffsetWidth) && Boolean(bubbleOffsetHeight) && isVisible;

    useAnimationFrames(update, doAnimate);

    // NOTE: This is kind of a dirty hack to update at least once per render
    useEffect(() => {
      if (!doAnimate) {
        updateBubbleMeta();
        updateStyles();
      }
    });

    return (
      <div
        ref={containerElement}
        className={clsx("relative", className)}
        style={{ padding: boundary }}
      >
        {/* NOTE: Separate, absolutely-positioned bubble is necessary to allow separate values for
        * left/right, top/bottom, creating the particular bounciness of the bubble effect. */}
        <div
          ref={bubbleElement}
          className={clsx(
            "absolute overflow-hidden",
            "transition-colors duration-500 ease-out",
            "inset-0",
            "bg-stone-300/25",
            isUpdatePending && debug && "bg-blue-300/75!",
            isUpdatePending && "will-change-transform",
            bubbleClassname,
          )}
          style={{
            borderRadius: rounding + boundary
          }}
        >
          <div
            className={clsx(
              "absolute bg-stone-50/95 mix-blend-lighten",
              innerBubbleClassname
            )}
            style={{
              inset: boundary,
              borderRadius: rounding,
            }}
          />
        </div>
        <div
          ref={contentElement}
          className={clsx("relative", isUpdatePending && "will-change-transform")}
        >
          {children}
        </div>
        {(debug || showIndicators) && (
          <div className="absolute w-4 h-4 top-1/2 left-1/2">
            <div className="relative rounded-full w-4 h-4 -left-1/2 -top-1/2 overflow-visible mix-blend-lighten bg-blue-300/100">
              <div ref={offsetIndicatorElement} className="absolute rounded-full w-4 h-4 contain-layout mix-blend-lighten bg-green-300/100" />
              <div ref={lerpedOffsetIndicatorElement} className="absolute rounded-full w-4 h-4 contain-layout mix-blend-lighten bg-red-300/100" />
            </div>
          </div>
        )}
      </div>
    )
  }
);
