"use client";

import { FC, memo, ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import {
  populateVectorSegmentsPrimitive,
  RoundedRectangle,
  RoundedShapeWithHole,
} from "@/app/utils/findVectorSegmentsInShape";
import {
  BUBBLE_STIFFNESS,
  BUBBLE_OVERKILL,
  SPRING_STIFFNESS,
  BUBBLE_BOUNDARY,
} from "@/app/utils/physicsConsts";
import {
  Vec2,
  addVec2Mutable,
  multiplyVecMutable,
  clampVecMutable,
  createVec2,
  zeroVec2,
} from "@/app/utils/vector";
import { BubblePhysics } from "@/app/utils/BubblePhysics";
import { mouseService } from "@/app/utils/mouseService";
import { DebugContext } from "@/app/components/DebugContext";
import { useDebuggableValue } from "@/app/hooks/useDebuggableValue";
import { useBatchedAnimation } from "@/app/hooks/useBatchedAnimation";
import { getAbsoluteOffset } from "@/app/utils/dom";
import { resizeService } from "@/app/utils/resizeService";

const DEFAULT_ROUNDING = 24;
const DEFAULT_OFFSET_LERP_AMOUNT = 0.05;
const INDICATOR_AMPLIFICATION = 2;

const INIT_DOM_MEASUREMENTS = {
  bubbleOffsetWidth: 0,
  bubbleOffsetHeight: 0,
  containerOffsetTop: 0,
  containerOffsetLeft: 0,
}

// TODO: name this something more descriptive...
const asymmetricFilter = (v: number) => v < 0 ? v / 3 : v;

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


type HoverBubbleProps = {
  children?: ReactNode;
  boundary?: number;
  rounding?: number;
  sluggishness?: number;
  stiffness?: number;
  overkill?: number;
  seed?: number;
  moveOnMount?: boolean;
  className?: string;
  bubbleClassname?: string;
  backgroundClassname?: string;
  backgroundColor?: string;
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
    stiffness: _stiffness = SPRING_STIFFNESS,
    overkill: _overkill = BUBBLE_OVERKILL,
    seed,
    moveOnMount = false,
    className,
    bubbleClassname,
    backgroundClassname,
    backgroundColor,
    insetFilter = asymmetricFilter,
    showIndicators = false,
  }) {
    const componentId = useId();
    const { debug } = useContext(DebugContext);

    const overkill = useDebuggableValue('bubbleOverkill', _overkill, true);
    const springStiffness = useDebuggableValue('springStiffness', _stiffness, true);
    const boundary = useDebuggableValue('bubbleBoundary', _boundary, true);
    const doubleBoundary = 2 * boundary;

    // always start with at least one frame of animation to set clipPath
    const [isUpdatePending, setIsUpdatePending] = useState(true);

    const containerElement = useRef<HTMLDivElement>(null);
    const bubbleElement = useRef<HTMLDivElement>(null);
    const contentElement = useRef<HTMLDivElement>(null);
    const offsetIndicatorElement = useRef<HTMLDivElement>(null);
    const lerpedOffsetIndicatorElement = useRef<HTMLDivElement>(null);

    const physics = useMemo<BubblePhysics>(() => {
      const bubblePhysics = new BubblePhysics({
        springStiffness: _stiffness,
        sluggishness,
      })

      bubblePhysics.reset(moveOnMount, seed);

      return bubblePhysics;
    }, [_stiffness, moveOnMount, seed, sluggishness]);

    // Pre-allocated primitive coordinate arrays for zero-allocation segments
    const MAX_SEGMENTS = 20;
    const segmentStartX = useRef<Float64Array>(new Float64Array(MAX_SEGMENTS));
    const segmentStartY = useRef<Float64Array>(new Float64Array(MAX_SEGMENTS));
    const segmentEndX = useRef<Float64Array>(new Float64Array(MAX_SEGMENTS));
    const segmentEndY = useRef<Float64Array>(new Float64Array(MAX_SEGMENTS));

    // Pre-allocated shape to eliminate object creation on every call
    const shapeWithHole = useRef<RoundedShapeWithHole | null>(null);

    const bubbleMeta = useRef<BubbleMeta>({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
    })

    // Object pools for reusable objects
    const tempVec = useRef<Vec2>(createVec2());
    const intersectionVec = useRef<Vec2>(createVec2());
    const clampTempVec = useRef<Vec2>(createVec2());

    const [{
      bubbleOffsetWidth,
      bubbleOffsetHeight,
      containerOffsetTop,
      containerOffsetLeft,
    }, setDomMeasurements] = useState(INIT_DOM_MEASUREMENTS);

    const updateDomMeasurements = useCallback(() => {
      const currentContainer = containerElement.current;

      if (currentContainer) {
        const { offsetTop, offsetLeft } = getAbsoluteOffset(currentContainer);

        setDomMeasurements({
          bubbleOffsetWidth: bubbleElement.current?.offsetWidth ?? 0,
          bubbleOffsetHeight: bubbleElement.current?.offsetHeight ?? 0,
          containerOffsetTop: Math.round(offsetTop),
          containerOffsetLeft: Math.round(offsetLeft),
        });
      }
    }, []);

    useEffect(() => {
      if (containerElement.current?.parentElement) {
        const unsubscribeToParent = resizeService.subscribe(
          containerElement.current.parentElement,
          updateDomMeasurements,
        );
        const unsubscribeToDocument = resizeService.subscribe(
          document.documentElement,
          updateDomMeasurements,
        );

        return () => {
          unsubscribeToParent();
          unsubscribeToDocument();
        }
      }
    }, [updateDomMeasurements]);

    const updateStyles = useCallback(() => {
      const bubbleStyle = bubbleElement.current?.style;
      const contentStyle = contentElement.current?.style;
      const offsetIndicatorStyle = offsetIndicatorElement.current?.style;
      const lerpedOffsetIndicatorStyle = lerpedOffsetIndicatorElement.current?.style;

      const {
        offset: [
          offsetX,
          offsetY,
        ],
        lerpedOffset: [
          lerpedOffsetX,
          lerpedOffsetY
        ],
      } = physics.getState();

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
      const translateX = (bubbleLeft - bubbleRight) * 0.5;
      const translateY = (bubbleTop - bubbleBottom) * 0.5;

      // Use cached style reference
      if (bubbleStyle) {
        bubbleStyle.transform = `matrix(${scaleX},0,0,${scaleY},${translateX},${translateY})`;
      }

      if (contentStyle) {
        // Avoid shifting the text content too much since it still needs to be readable
        const contentOffsetX = offsetX * 0.5;
        const contentOffsetY = offsetY * 0.5;

        const distortionX = scaleX - 1;
        const distortionY = scaleY - 1;
        const scaleAvg = (scaleX + scaleY) * 0.5;

        // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
        const clipX = bubbleLeft - contentOffsetX + boundary * distortionX;
        const clipY = bubbleTop - contentOffsetY + boundary * distortionY;

        const clipWidth = Math.max(bubbleWidth - doubleBoundary * scaleX, 0);
        const clipHeight = Math.max(bubbleHeight - doubleBoundary * scaleY, 0);

        const clipRounding = Math.max(rounding - boundary, 0) * scaleAvg;

        contentStyle.clipPath = `xywh(${clipX}px ${clipY}px ${clipWidth}px ${clipHeight}px round ${clipRounding}px)`;
        contentStyle.transform = `translate(${contentOffsetX}px,${contentOffsetY}px)`;
      }

      if (offsetIndicatorStyle) {
        const offsetTransformX = offsetX * INDICATOR_AMPLIFICATION;
        const offsetTransformY = offsetY * INDICATOR_AMPLIFICATION;
        offsetIndicatorStyle.transform = `translate(${offsetTransformX}px,${offsetTransformY}px)`;
      }

      if (lerpedOffsetIndicatorStyle) {
        const lerpedTransformX = lerpedOffsetX * INDICATOR_AMPLIFICATION;
        const lerpedTransformY = lerpedOffsetY * INDICATOR_AMPLIFICATION;
        lerpedOffsetIndicatorStyle.transform = `translate(${lerpedTransformX}px,${lerpedTransformY}px)`;
      }
    }, [physics, bubbleOffsetWidth, bubbleOffsetHeight, boundary, doubleBoundary, rounding]);

    // Object pools for reused shapes
    const outerRectangle = useRef<RoundedRectangle>({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      radius: 0,
    });
    const innerRectangle = useRef<RoundedRectangle>({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      radius: 0,
    });

    useEffect(() => {
      const handleMouseMove = (currMouseX: number, currMouseY: number, prevMouseX: number, prevMouseY: number) => {
        const {
          top: bubbleTop,
          left: bubbleLeft,
          width: bubbleWidth,
          height: bubbleHeight,
        } = bubbleMeta.current;

        const outer = outerRectangle.current;
        const inner = innerRectangle.current;

        outer.x = containerOffsetLeft + bubbleLeft;
        outer.y = containerOffsetTop + bubbleTop;
        outer.width = bubbleWidth;
        outer.height = bubbleHeight;
        outer.radius = rounding;

        inner.x = outer.x + boundary;
        inner.y = outer.y + boundary;
        inner.width = outer.width - doubleBoundary;
        inner.height = outer.height - doubleBoundary;
        inner.radius = rounding - boundary;

        // Reuse pre-allocated shape instead of creating new object
        if (!shapeWithHole.current) {
          shapeWithHole.current = new RoundedShapeWithHole(outer, inner);
        } else {
          // Update references instead of creating new object
          shapeWithHole.current.outer = outer;
          shapeWithHole.current.hole = inner;
        }

        const segmentCount = populateVectorSegmentsPrimitive(
          segmentStartX.current,
          segmentStartY.current,
          segmentEndX.current,
          segmentEndY.current,
          MAX_SEGMENTS,
          currMouseX,
          currMouseY,
          prevMouseX,
          prevMouseY,
          shapeWithHole.current
        );

        if (segmentCount > 0) {
          zeroVec2(intersectionVec.current);

          for (let i = 0; i < segmentCount; i++) {
            // Convert primitive coordinates to vector manually - zero allocations
            tempVec.current[0] = segmentStartX.current[i] - segmentEndX.current[i];
            tempVec.current[1] = segmentStartY.current[i] - segmentEndY.current[i];
            addVec2Mutable(intersectionVec.current, tempVec.current);
          }

          clampVecMutable(intersectionVec.current, -doubleBoundary, doubleBoundary, clampTempVec.current);
          multiplyVecMutable(intersectionVec.current, BUBBLE_STIFFNESS);

          physics.addImpulse(intersectionVec.current);

          if (!isUpdatePending) setIsUpdatePending(true);
        }
      };

      const unsubscribe = mouseService.subscribe(componentId, handleMouseMove);

      return unsubscribe;
    }, [
      componentId,
      boundary,
      doubleBoundary,
      isUpdatePending,
      containerOffsetLeft,
      containerOffsetTop,
      overkill,
      rounding,
      physics
    ]);



    const updateBubbleMeta = useCallback(() => {
      const [lerpedOffsetX, lerpedOffsetY] = physics.getState().lerpedOffset;

      const presentationOffsetX = overkill * lerpedOffsetX;
      const presentationOffsetY = overkill * lerpedOffsetY;

      const nextTop = insetFilter(presentationOffsetY);
      const nextRight = insetFilter(-presentationOffsetX);
      const nextBottom = insetFilter(-presentationOffsetY);
      const nextLeft = insetFilter(presentationOffsetX);

      bubbleMeta.current.top = nextTop;
      bubbleMeta.current.right = nextRight;
      bubbleMeta.current.bottom = nextBottom;
      bubbleMeta.current.left = nextLeft;

      bubbleMeta.current.width = bubbleOffsetWidth - nextLeft - nextRight;
      bubbleMeta.current.height = bubbleOffsetHeight - nextTop - nextBottom;

    }, [bubbleOffsetHeight, bubbleOffsetWidth, insetFilter, overkill, physics]);

    // NOTE: All ref state updates are performed in their corresponding update_ method
    const update = useCallback((delta: number) => {
      physics.addSpringForce();
      const shouldUpdate = physics.hasActiveForces();

      const shouldContinue = physics.step(delta);

      if (!shouldContinue) {
        setIsUpdatePending(false);
      }

      if (shouldUpdate) {
        updateBubbleMeta();
        updateStyles();
      }
    }, [physics, updateBubbleMeta, updateStyles]);

    // Update physics configuration when props change
    useEffect(() => {
      physics.updateConfiguration({
        springStiffness,
        sluggishness,
      });
    }, [springStiffness, sluggishness, physics]);

    // Offset values are always undefined on first render, and shouldn't be accessed directly
    // in applySpringForce since DOM property access is so slow. This avoids essentially all
    // animation frame cancellations, which are expensive during my ridiculous FakePostList
    // pop-in effect. Kinda weird, but makes a sizeable difference on slow CPUs
    const doAnimate = isUpdatePending && Boolean(bubbleOffsetWidth) && Boolean(bubbleOffsetHeight);

    useBatchedAnimation(update, doAnimate);

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
        className={clsx("relative contain-layout", className)}
        style={{ padding: boundary }}
      >
        {/* NOTE: Separate, absolutely-positioned bubble is necessary to allow separate values for
        * left/right, top/bottom, creating the particular bounciness of the bubble effect. */}
        <div
          ref={bubbleElement}
          className={clsx(
            "absolute overflow-hidden inset-0 border-deep-200/50",
            "transition-colors duration-500 ease-out",
            isUpdatePending && debug && "border-saguaro-200!",
            doAnimate && "will-change-transform",
            backgroundClassname ?? "bg-extralight",
            bubbleClassname,
          )}
          style={{
            borderRadius: rounding,
            borderWidth: boundary,
            backgroundColor,
          }}
        />
        <div
          ref={contentElement}
          className={clsx("relative", doAnimate && "will-change-transform")}
          style={{
            borderRadius: rounding - boundary,
          }}
        >
          {children}
        </div>
        {(debug || showIndicators) && (
          <div className="absolute w-4 h-4 top-1/2 left-1/2">
            <div
              className={clsx(
                "relative -top-1/2 -left-1/2 m-auto overflow-visible",
                "rounded-full p-2 bg-black",
              )}
            >
              <div
                className={clsx(
                  "absolute inset-0 rounded-full p-2",
                  "mix-blend-difference bg-[color(display-p3_0_0_1)]",
                )}
              />
              <div
                ref={offsetIndicatorElement}
                className={clsx(
                  "absolute inset-0 rounded-full p-2 contain-layout",
                  "mix-blend-difference bg-[color(display-p3_0_1_0)]",
                  doAnimate && "will-change-transform"
                )}
              />
              <div
                ref={lerpedOffsetIndicatorElement}
                className={clsx(
                  "absolute inset-0 rounded-full p-2 contain-layout",
                  "mix-blend-difference bg-[color(display-p3_1_0_0)]",
                  doAnimate && "will-change-transform"
                )}
              />
            </div>
          </div>
        )}
      </div>
    )
  }
);
