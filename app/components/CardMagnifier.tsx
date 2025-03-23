"use client";

import {
  Children,
  FC,
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";
import clsx from "clsx";
import { clamp } from "lodash/fp";

import { useEaseUpDown, EasingDirection } from "@/app/hooks/useEaseUpDown";
import { AnimatedVariablesContext } from "./AnimatedVariables";
import { throttle } from "lodash";

const EASING_MS = 300;

type CardProps = {
  size: number;
  onFocus: FocusEventHandler;
  onBlur: FocusEventHandler;
  children: ReactNode;
}

export const Card: FC<CardProps> = ({ size, onFocus, onBlur, children }) => {
  return (
    <li
      tabIndex={0}
      className="outline-none focus:shadow-outline flex-shrink-0"
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        height: size,
        width: size,
      }}
    >
      {children}
    </li>
  )
}

const clampPosToFalloffBounds = (
  pos: number,
  mousePos: number,
  sliceLength: number,
  falloff: number,
) => {
  return clamp(-1, 1, (pos - mousePos) / (falloff * sliceLength));
}

type ScaleStrategy =
  | 'linear'
  | 'cosEaseInOut'
  | 'marching'
  | 'square';

// A set of functions where
//   f(mousePos) = 1
//   f(Math.abs(mousePos - pos) > FALLOFF * sliceLength) = 0
// and symmetrical across the lines from the origin to [1,1] and [-1, 1]
const SCALE_STRATEGY: Record<ScaleStrategy, (
  distance: number,
) => number> = {
  cosEaseInOut: distance => 0.5 + Math.cos(Math.PI * distance) / 2,
  linear: distance => 1 - Math.abs(distance),
  marching: distance => Math.abs(Math.cos(Math.PI * distance) * Math.cos(2 * Math.PI * distance)),
  square: distance => Math.pow(distance, 2),
};

export type CardMagnifierProps = {
  children?: ReactNode;
  direction?: 'horizontal' | 'vertical';
  // The size of each element when unscaled
  basis: number;
  gap: number;
  scaleStrategy?: ScaleStrategy;
  shiftStrategy?: 'elegant' | 'accurate' | 'disabled';
  className?: string;
  // falloff is how many slice lengths it takes for a card to reach scale 1
  // NOTE: falloff needs to be a whole number to maintain size stability
  falloff?: number;
  // scale is how large the card will be with the cursor at the center
  scale?: number;
}

const logFalloffWarning = throttle(
  () => console.warn('Carousel must contain at least `falloff * 2` children'),
  5000,
)

const roundToPrecision = (num: number, places = 1) => {
  const multiplier = 10 ** places;

  return Math.round(num * multiplier) / multiplier;
}

export const CardMagnifier: FC<CardMagnifierProps> = ({
  children,
  direction = 'horizontal',
  basis,
  gap,
  className,
  scaleStrategy = 'cosEaseInOut',
  shiftStrategy = 'accurate',
  falloff: _falloff = 3,
  scale = 3,
}) => {
  const animatedVariables = useContext(AnimatedVariablesContext);
  const isVertical = direction === 'vertical';

  const containerElement = useRef<HTMLUListElement>(null);

  const [normMousePosition, setNormMousePosition] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);

  const easingFactor = useEaseUpDown(
    EASING_MS,
    isMouseOver ? EasingDirection.UP : EasingDirection.DOWN
  );

  // FIXME: this is now being recomputed on every render
  const {
    falloff,
    totalCards,
    totalGaps,
    unscaledLength,
    sliceLength,
    normCardLength,
    normGapLength,
    halfSizeDiff,
    maxTotalSize,
    cardPositions,
    gapPositions,
    focusHandlers,
  } = useMemo(() => {
    const totalCards = Children.count(children);
    const falloff = totalCards >= 2 * _falloff
      ? _falloff
      : Math.floor(totalCards / 2);
    if (falloff !== _falloff) logFalloffWarning();
    const totalGaps = totalCards - 1;
    const unscaledLength = totalCards * (basis + gap) - gap;
    // percentage of total length taken up by cards
    const normTotalCardLength = totalCards * basis / unscaledLength;
    // percentage of total length taken up by gaps
    const normTotalGapLength = 1 - normTotalCardLength;
    // normed length of a single card
    const normCardLength = normTotalCardLength / totalCards;
    const halfNormCardLength = normCardLength / 2;
    // normed length of a single gap
    const normGapLength = normTotalGapLength / totalGaps;
    // rounding fixes rare but persistent floating point math errors
    const sliceLength = roundToPrecision(normCardLength + normGapLength, 12);
    const halfSliceLength = sliceLength / 2;

    const sizeDiff = falloff * (basis + gap) * (scale - 1);
    const maxTotalSize = unscaledLength + sizeDiff;
    const halfSizeDiff = sizeDiff / 2;

    animatedVariables.set("halfSizeDiff", halfSizeDiff.toFixed(2))
    animatedVariables.set("maxTotalSize", maxTotalSize.toFixed(2))

    const cardPositions: number[] = [];
    const gapPositions: number[] = [];
    const focusHandlers: Array<{ focus: FocusEventHandler; blur: FocusEventHandler }> = [];
    for (let i = 0; i < totalCards; i++) {
      cardPositions.push(halfNormCardLength + i * sliceLength);
      if (i < (totalCards - 1)) gapPositions.push(cardPositions[i] + halfSliceLength);

      focusHandlers.push({
        focus: () => {
          // mock the cursor being positioned over this card
          setNormMousePosition(cardPositions[i]);

          setIsMouseOver(true);
        },
        // detect if next focus is going to another card
        blur: e => {
          const nextFocusIsCard = e.relatedTarget?.parentElement === e.currentTarget.parentElement;

          if (!nextFocusIsCard) {
            setIsMouseOver(false);
          }
        }
      });
    }

    return {
      falloff,
      totalCards,
      totalGaps,
      unscaledLength,
      sliceLength,
      normCardLength,
      normGapLength,
      halfSizeDiff,
      maxTotalSize,
      cardPositions,
      gapPositions,
      focusHandlers,
    }
  }, [children, _falloff, basis, gap, scale]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove: MouseEventHandler = useCallback(event => {
    if (containerElement.current) {
      if (isVertical) {
        const relativeY = event.pageY - containerElement.current.offsetTop;
        const normY = relativeY / unscaledLength;

        setNormMousePosition(clamp(0, 1, normY));
      } else {
        const relativeX = event.pageX - containerElement.current.offsetLeft;
        const normX = relativeX / unscaledLength;

        setNormMousePosition(clamp(0, 1, normX));
      }
    }
  }, [isVertical, unscaledLength]);

  const parentCrossAxisLength = containerElement?.current?.parentElement?.getBoundingClientRect()[
    isVertical
      ? 'width'
      : 'height'
  ];
  // if SCALE would push beyond the bounds of the container,
  // only use up to maximum available cross-axis space
  const maxAvailableScale = parentCrossAxisLength
    ? Math.min(scale, parentCrossAxisLength / basis)
    : scale;
  const scaleFactor = maxAvailableScale - 1;

  const cardScales = cardPositions.map(normCardPosition => {
    // 1 at mouse position, decreasing linearly to 0 at or beyond distance FALLOFF * sliceLength
    const scale = SCALE_STRATEGY[scaleStrategy](
      clampPosToFalloffBounds(normCardPosition, normMousePosition, sliceLength, falloff)
    );

    return 1 + scaleFactor * scale;
  });

  const gapScales = gapPositions.map(normGapPosition => {
    // 1 at mouse position, decreasing linearly to 0 at or beyond distance FALLOFF * sliceLength
    const scale = SCALE_STRATEGY[scaleStrategy](
      clampPosToFalloffBounds(normGapPosition, normMousePosition, sliceLength, falloff)
    );

    return 1 + scaleFactor * scale;
  });

  const totalCardSize = cardScales.reduce((totalCardSize, size) => totalCardSize + size * basis, 0);
  const totalGapSize = gapScales.reduce((totalGapSize, size) => totalGapSize + size * gap, 0)
  const totalSize = totalCardSize + totalGapSize;

  const getShift = () => {
    if (shiftStrategy === 'disabled') return 0;
    else if (shiftStrategy === 'elegant') {
      // TODO: don't love this branching logic, but shift needs to increase from 0 to
      // halfSizeDiff from up to FALLOFF * sliceLength (i.e. max size) and then stay
      // at halfSizeDiff for higher values of normMousePosition, and the size increase
      // from 0 to FALLOFF * sliceLength is not linear for easy easing
      return halfSizeDiff - (maxTotalSize - totalSize) * Number(normMousePosition < 0.5);
    } else {
      const unscaledSizeAtMousePos = unscaledLength * normMousePosition;
      const mousePosInSliceLengths = normMousePosition / sliceLength;
      const sliceRemainder = normMousePosition % sliceLength;
      const isInCard = sliceRemainder < normCardLength;
      const completeSlices = Math.floor(mousePosInSliceLengths);
      const completeCards = Math.min(completeSlices + Number(!isInCard), totalCards);
      const completeGaps = Math.min(completeSlices, totalGaps);

      const completedCardSize = cardScales
        .slice(0, completeCards)
        .reduce((total, scale) => total + scale * basis, 0);
      const completedGapSize = gapScales
        .slice(0, completeGaps)
        .reduce((total, scale) => total + scale * gap, 0);
      const remainderSize = isInCard
        ? sliceRemainder / normCardLength * cardScales[completeCards] * basis
        : sliceRemainder % normCardLength / normGapLength * gapScales[Math.min(completeGaps, totalGaps - 1)] * gap;
      const scaledSizeAtMousePos = completedCardSize + completedGapSize + remainderSize;

      return scaledSizeAtMousePos - unscaledSizeAtMousePos;
    }
  }

  const shift = easingFactor * getShift();

  animatedVariables.set("easingFactor", easingFactor);
  animatedVariables.set("normMousePosition", normMousePosition);
  animatedVariables.set("normShift", shift / halfSizeDiff);

  // when scaling, set cross axis to the maximum scale to minimize reflow
  const crossAxisLength = (1 + easingFactor * (maxAvailableScale - 1)) * basis;

  // TODO: add a warning when falloff is overridden b/c/o number of children
  return (
    <ul
      ref={containerElement}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => setIsMouseOver(false)}
      // TODO: Ideally this should work even if the ul has a border,
      // although I guess you could always add a wrapping border element...
      className={clsx('relative', className)}
      style={{
        [isVertical ? 'maxHeight' : 'maxWidth']: unscaledLength
      }}
    >
      <div
        className="relative flex"
        style={{
          [isVertical ? 'top' : 'left']: -shift,
          [isVertical ? 'width' : 'height']: crossAxisLength,
          flexDirection: isVertical ? 'column' : 'row',
          alignItems: isVertical ? 'center' : 'flex-end',
        }}
      >
        {Children.map(children, (child, index) => {
          const gapSize = `${((1 + easingFactor * (gapScales[index] - 1)) * gap).toFixed(2)}px`;

          return (
            <>
              <Card
                size={(1 + easingFactor * (cardScales[index] - 1)) * basis}
                onFocus={focusHandlers[index].focus}
                onBlur={focusHandlers[index].blur}
              >
                {child}
              </Card>
              {index < (totalCards - 1) && (
                <div style={{
                  width: gapSize,
                  height: gapSize,
                  flexShrink: 0,
                }} />
              )}
            </>
          )
        })}
      </div>
    </ul>
  )
}

