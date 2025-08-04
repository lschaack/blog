"use client";

import { FC, memo, ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import {
  BUBBLE_OVERKILL,
  SPRING_STIFFNESS,
  BUBBLE_BOUNDARY,
} from "@/app/utils/physicsConsts";
import { BubblePhysics } from "@/app/utils/bubble/BubblePhysics";
import { BubblePresentation } from "@/app/utils/bubble/BubblePresentation";
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

    // always start with at least one frame of animation to set clipPath
    const [isUpdatePending, setIsUpdatePending] = useState(true);

    const containerElement = useRef<HTMLDivElement>(null);
    const bubbleElement = useRef<HTMLDivElement>(null);
    const contentElement = useRef<HTMLDivElement>(null);
    const offsetIndicatorElement = useRef<HTMLDivElement>(null);
    const lerpedOffsetIndicatorElement = useRef<HTMLDivElement>(null);

    /********** DOM measurement **********/
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

    /********** Bubble model **********/
    const physics = useMemo<BubblePhysics>(() => new BubblePhysics({
      springStiffness: _stiffness,
      sluggishness,
      randomize: moveOnMount,
      seed,
    }), [_stiffness, moveOnMount, seed, sluggishness]);

    const presentation = useMemo<BubblePresentation>(() => {
      return new BubblePresentation({
        overkill: _overkill,
        insetFilter,
        width: 0, // Will be updated when DOM measurements are available
        height: 0,
        boundary: _boundary,
        rounding,
        x: 0,
        y: 0,
      });
    }, [_overkill, insetFilter, _boundary, rounding]);

    // Update physics configuration when props change
    useEffect(() => {
      physics.updateConfiguration({
        springStiffness,
        sluggishness,
      });
    }, [springStiffness, sluggishness, physics]);

    // Update presentation configuration when props change
    useEffect(() => {
      presentation.updateConfiguration({
        overkill,
        insetFilter,
        width: bubbleOffsetWidth,
        height: bubbleOffsetHeight,
        boundary,
        rounding,
        x: containerOffsetLeft,
        y: containerOffsetTop,
      });
    }, [overkill, insetFilter, bubbleOffsetWidth, bubbleOffsetHeight, boundary, rounding, containerOffsetLeft, containerOffsetTop, presentation]);

    /********** Interaction **********/
    useEffect(() => {
      const handleMouseMove = (currMouseX: number, currMouseY: number, prevMouseX: number, prevMouseY: number) => {
        const intersectionVec = presentation.collide(currMouseX, currMouseY, prevMouseX, prevMouseY);

        if (intersectionVec) {
          physics.addImpulse(intersectionVec);

          if (!isUpdatePending) setIsUpdatePending(true);
        }
      };

      const unsubscribe = mouseService.subscribe(componentId, handleMouseMove);

      return unsubscribe;
    }, [
      componentId,
      isUpdatePending,
      physics,
      presentation
    ]);

    /********** Updating physics -> presentation -> style **********/
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

      // Use presentation layer for style calculations
      if (bubbleStyle) {
        bubbleStyle.transform = presentation.getOuterTransform();
      }

      if (contentStyle) {
        contentStyle.transform = presentation.getInnerTransform(offsetX, offsetY);
        contentStyle.clipPath = presentation.getInnerClipPath(offsetX, offsetY);
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
    }, [physics, presentation]);

    const updateBubbleMeta = useCallback(() => {
      const { lerpedOffset } = physics.getState();

      presentation.updateMeta(lerpedOffset);
    }, [physics, presentation]);

    const update = useCallback((delta: number) => {
      physics.step(delta);

      updateBubbleMeta();
      updateStyles();

      if (physics.isStable()) {
        setIsUpdatePending(false);
      }
    }, [physics, updateBubbleMeta, updateStyles]);

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
