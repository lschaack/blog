"use client";

import {
  Children,
  FC,
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
  TouchEventHandler,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";
import clsx from "clsx";
import clamp from "lodash/clamp";
import throttle from "lodash/throttle";

import { useEaseUpDown } from "@/app/hooks/useEaseUpDown";
import { AnimatedVariablesContext } from "@/app/components/AnimatedVariables";
import { EasingDirection } from "@/app/utils/requestEasingFrames";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { roundToPrecision } from "@/app/utils/precision";

const EASING_MS = 200;
const DRAG_MODIFIER = 1000;

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
  return clamp((pos - mousePos) / (falloff * sliceLength), -1, 1);
}

export type ScaleStrategy =
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

export type ShiftStrategy = 'elegant' | 'elegantAndWrong' | 'accurate' | 'disabled';

export type CardMagnifierProps = {
  children?: ReactNode;
  vertical?: boolean;
  // The size of each element when unscaled
  basis: number;
  gap: number;
  scaleStrategy?: ScaleStrategy;
  shiftStrategy?: ShiftStrategy;
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

const MEDIA_QUERY = '(max-width: 600px)';

// TODO: change "size" to "length"
export const CardMagnifier: FC<CardMagnifierProps> = ({
  children,
  vertical,
  basis,
  gap,
  className,
  scaleStrategy = 'cosEaseInOut',
  shiftStrategy = 'accurate',
  falloff: _falloff = 3,
  scale = 3,
}) => {
  const animatedVariables = useContext(AnimatedVariablesContext);
  // FIXME: Avoid the blink of horizontal state that happens on mobile load if possible
  const isMediaQuery = useMediaQuery(MEDIA_QUERY);
  const isVertical = vertical ?? isMediaQuery;

  const containerElement = useRef<HTMLUListElement>(null);

  const [mousePos, setMousePos] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const easingFactor = useEaseUpDown(
    EASING_MS,
    isMouseOver ? EasingDirection.UP : EasingDirection.DOWN
  );

  const {
    falloff,
    totalCards,
    totalGaps,
    unscaledLength,
    sliceLength,
    normCardLength,
    normGapLength,
    halfSizeDiff,
    sizeDiffWrong,
    maxScaledSize,
    cardPositions,
    gapPositions,
    focusHandlers,
  } = useMemo(() => {
    const totalCards = Children.count(children);
    const falloff = totalCards >= 2 * _falloff || shiftStrategy === 'accurate'
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

    // TODO: is this still right if scaleFactor is less than scale - 1? I'd be confused if it was
    const sizeDiff = (scale - 1) * falloff * (basis + gap);
    // calculate wrong value for blog
    const sizeDiffWrong = scale * falloff * (basis + gap);
    const maxScaledSize = unscaledLength + sizeDiff;
    const halfSizeDiff = sizeDiff / 2;

    animatedVariables.set("expectedSizeDiffWrong", Math.round(sizeDiffWrong))
    animatedVariables.set("halfSizeDiff", halfSizeDiff.toFixed(2))
    animatedVariables.set("maxScaledSize", maxScaledSize.toFixed(2))

    const cardPositions: number[] = [];
    const gapPositions: number[] = [];
    const focusHandlers: Array<{ focus: FocusEventHandler; blur: FocusEventHandler }> = [];
    for (let i = 0; i < totalCards; i++) {
      cardPositions.push(halfNormCardLength + i * sliceLength);
      if (i < (totalCards - 1)) gapPositions.push(cardPositions[i] + halfSliceLength);

      focusHandlers.push({
        focus: () => {
          // mock the cursor being positioned over this card
          setMousePos(cardPositions[i]);

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
      sizeDiffWrong,
      maxScaledSize,
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

        setMousePos(clamp(normY, 0, 1));
      } else {
        const relativeX = event.pageX - containerElement.current.offsetLeft;
        const normX = relativeX / unscaledLength;

        setMousePos(clamp(normX, 0, 1));
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

  const cardScales = cardPositions.map(cardPos => {
    const normDistanceFromCursor = clampPosToFalloffBounds(
      cardPos,
      mousePos,
      sliceLength,
      falloff
    );

    const normScale = SCALE_STRATEGY[scaleStrategy](normDistanceFromCursor);

    return 1 + normScale * scaleFactor;
  });

  const gapScales = gapPositions.map(gapPos => {
    const normDistanceFromCursor = clampPosToFalloffBounds(
      gapPos,
      mousePos,
      sliceLength,
      falloff
    );

    const normScale = SCALE_STRATEGY[scaleStrategy](normDistanceFromCursor);

    return 1 + normScale * scaleFactor;
  });

  const measuredCardSize = cardScales.reduce((totalCardSize, size) => totalCardSize + size * basis, 0);
  const measuredGapSize = gapScales.reduce((totalGapSize, size) => totalGapSize + size * gap, 0)
  const measuredSize = measuredCardSize + measuredGapSize;

  const getShift = () => {
    if (shiftStrategy === 'disabled') return 0;
    else if (shiftStrategy === 'elegant') {
      return halfSizeDiff - (maxScaledSize - measuredSize) * Number(mousePos < 0.5);
    } else if (shiftStrategy === 'elegantAndWrong') {
      return sizeDiffWrong / 2 - (maxScaledSize - measuredSize);
    } else {
      const unscaledSizeAtMousePos = unscaledLength * mousePos;

      const mousePosInSliceLengths = mousePos / sliceLength;
      const sliceRemainder = mousePos % sliceLength;
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

      const remainderBasis = isInCard
        ? (cardScales[completeCards] ?? 0) * basis
        : gapScales[Math.min(completeGaps, totalGaps - 1)] * gap;
      const normRemainder = isInCard
        ? sliceRemainder / normCardLength
        : sliceRemainder % normCardLength / normGapLength;

      const remainderSize = normRemainder * remainderBasis;

      const scaledSizeAtMousePos = completedCardSize + completedGapSize + remainderSize;

      return scaledSizeAtMousePos - unscaledSizeAtMousePos;
    }
  }

  // TODO: set scroll height to center largest image?
  const handleTouchMove: TouchEventHandler<HTMLUListElement> = e => {
    if (touchStart) {
      const delta = e.touches[0][isVertical ? 'pageY' : 'pageX'] - touchStart;

      setMousePos(clamp(mousePos - delta / DRAG_MODIFIER, 0, 1));
      setTouchStart(e.touches[0][isVertical ? 'pageY' : 'pageX']);
    }
  }

  const shift = easingFactor * getShift();

  animatedVariables.set("observedSizeDiff", Math.round(measuredSize - unscaledLength));
  animatedVariables.set("easingFactor", easingFactor);
  animatedVariables.set("normMousePosition", mousePos);
  // prevent division by 0
  animatedVariables.set("normShift", halfSizeDiff ? shift / halfSizeDiff : 0);

  // when scaling, set cross axis to the maximum scale to minimize reflow
  const crossAxisLength = (1 + easingFactor * (maxAvailableScale - 1)) * basis;

  return (
    <ul
      ref={containerElement}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => setIsMouseOver(false)}
      onTouchStart={e => {
        setTouchStart(e.touches[0][isVertical ? 'pageY' : 'pageX']);
        setIsMouseOver(true);
      }}
      onTouchEnd={() => {
        setTouchStart(null);
        setIsMouseOver(false);
      }}
      onTouchMove={handleTouchMove}
      className={clsx('relative touch-none contain-layout', className)}
      style={{
        [isVertical ? 'maxHeight' : 'maxWidth']: unscaledLength,
        justifySelf: isVertical ? 'center' : 'unset',
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

