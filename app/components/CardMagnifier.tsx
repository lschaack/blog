"use client";

import {
  Children,
  FC,
  FocusEventHandler,
  MouseEventHandler,
  PropsWithChildren,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import clsx from "clsx";
import { clamp } from "lodash/fp";

import { useEaseUpDown, EasingDirection } from "@/app/hooks/useEaseUpDown";

// min scale is how small the card can possibly be as a factor of `basis`
const MIN_SCALE = 1;
const EASING_MS = 300;

const CardSize = createContext(0);
type CardFocusContext = {
  focus: FocusEventHandler;
  blur: FocusEventHandler;
}
const CardFocus = createContext<CardFocusContext>({
  focus: () => undefined,
  blur: () => undefined,
});

export const Card: FC<PropsWithChildren> = ({ children }) => {
  const size = useContext(CardSize);
  const { focus, blur } = useContext(CardFocus);

  return (
    <li
      tabIndex={0}
      className="outline-none focus:shadow-outline flex-shrink-0"
      onFocus={focus}
      onBlur={blur}
      style={{
        height: size,
        width: size,
      }}
    >
      {children}
    </li>
  )
}

// FIXME:
// - inaccuracy occurs when falloff is any non-whole number
// - inaccuracy happens at the center of a card
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
  | 'cosEaseInOut';
// A set of functions where
//   f(mousePos) = 1
//   f(Math.abs(mousePos - pos) > FALLOFF * sliceLength) = 0
// and symmetrical across the lines from the origin to [1,1] and [-1, 1]
const SCALE_STRATEGY: Record<ScaleStrategy, (
  distance: number,
) => number> = {
  cosEaseInOut: distance => 0.5 + Math.cos(Math.PI * distance) / 2,
  linear: distance => 1 - Math.abs(distance),
};

// Necessary aspects of the scaling algorithm:
// - at full expansion, the total size of the scaled carousel should be stable
// - ^ this is currently only satisfied by linear and cosEaseInOut
type CardMagnifierProps = {
  children?: ReactNode;
  direction?: 'horizontal' | 'vertical';
  // The size of each element when unscaled
  basis: number;
  gap: number;
  scaleStrategy?: ScaleStrategy;
  className?: string;
  // falloff is how many slice lengths it takes for a card to reach MIN_SCALE
  falloff?: number;
  // scale is how large the card will be with the cursor at the center
  scale?: number;
}

export const CardMagnifier: FC<CardMagnifierProps> = ({
  children,
  direction = 'horizontal',
  basis,
  gap,
  className,
  scaleStrategy = 'linear',
  falloff: _falloff = 3,
  scale = 3,
}) => {
  const isVertical = direction === 'vertical';

  const containerElement = useRef<HTMLUListElement>(null);

  const [normMousePosition, setNormMousePosition] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);

  const easingFactor = useEaseUpDown(
    EASING_MS,
    isMouseOver ? EasingDirection.UP : EasingDirection.DOWN
  );

  const {
    falloff,
    totalCards,
    unscaledLength,
    sliceLength,
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
    if (falloff !== _falloff) console.warn('Carousel must contain at least `falloff * 2` children');
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
    const sliceLength = normCardLength + normGapLength;
    const halfSliceLength = sliceLength / 2;

    const totalSizeBasis = totalCards * basis + totalGaps * gap;
    const sizeDiff = falloff * (basis + gap) * (scale - 1);
    const maxTotalSize = totalSizeBasis + sizeDiff;
    const halfSizeDiff = sizeDiff / 2;

    __animatedVariables["halfSizeDiff"] = halfSizeDiff.toFixed(2);
    __animatedVariables["maxTotalSize"] = maxTotalSize.toFixed(2);

    const cardPositions: number[] = [];
    const gapPositions: number[] = [];
    const focusHandlers: CardFocusContext[] = [];
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
      unscaledLength,
      sliceLength,
      halfSizeDiff,
      maxTotalSize,
      cardPositions,
      gapPositions,
      focusHandlers,
    }
  }, [basis, gap, children, _falloff, scale]);

  const handleMouseMove: MouseEventHandler = useCallback(event => {
    if (containerElement.current) {
      if (isVertical) {
        const relativeY = event.pageY - containerElement.current.offsetTop;
        const normY = relativeY / unscaledLength;

        setNormMousePosition(normY);
      } else {
        const relativeX = event.pageX - containerElement.current.offsetLeft;
        const normX = relativeX / unscaledLength;

        setNormMousePosition(normX);
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
  const scaleFactor = maxAvailableScale - MIN_SCALE;

  const cardSizes = cardPositions.map(normCardPosition => {
    // 1 at mouse position, decreasing linearly to 0 at or beyond distance FALLOFF * sliceLength
    const scale = SCALE_STRATEGY[scaleStrategy](
      clampPosToFalloffBounds(normCardPosition, normMousePosition, sliceLength, falloff)
    );

    //TODO: get rid of MIN_SCALE or use it consistently
    return 1 + scaleFactor * scale;
  });

  const gapSizes = gapPositions.map(normGapPosition => {
    // 1 at mouse position, decreasing linearly to 0 at or beyond distance FALLOFF * sliceLength
    const scale = SCALE_STRATEGY[scaleStrategy](
      clampPosToFalloffBounds(normGapPosition, normMousePosition, sliceLength, falloff)
    );

    return 1 + scaleFactor * scale;
  });

  const totalCardSize = cardSizes.reduce((totalCardSize, size) => totalCardSize + size * basis, 0);
  const totalGapSize = gapSizes.reduce((totalGapSize, size) => totalGapSize + size * gap, 0)
  const totalSize = totalCardSize + totalGapSize;

  const getShift = () => {
    // TODO: don't love this branching logic, feels like I'm missing something
    // but shift needs to increase from 0 to halfSizeDiff from up to FALLOFF * sliceLength
    // (i.e. max size) and then stay at halfSizeDiff for higher values of normMousePosition,
    // and the size increase from 0 to FALLOFF * sliceLength is not linear for easy easing
    return halfSizeDiff - (maxTotalSize - totalSize) * Number(normMousePosition < 0.5);
  }

  const shift = easingFactor * getShift();
  __animatedVariables["shift"] = shift.toFixed(0);
  __animatedVariables["totalSize"] = totalSize.toFixed(0);
  __animatedVariables["totalCardSize"] = totalCardSize.toFixed(0);
  __animatedVariables["totalGapSize"] = totalGapSize.toFixed(0);
  __animatedVariables["mousePosInSliceLengths"] = (normMousePosition / sliceLength).toFixed(2);
  __animatedVariables["normMousePosition"] = normMousePosition.toFixed(2);
  __animatedVariables["easingFactor"] = easingFactor.toFixed(2);
  __animatedVariables["scale"] = scale.toFixed(2);
  __animatedVariables["falloff"] = falloff.toFixed(2);

  // when scaling, set cross axis to the maximum scale to minimize reflow
  const crossAxisLength = (1 + easingFactor * (maxAvailableScale - 1)) * basis;

  // TODO:
  // - bar representing unscaled length / normMousePosition at the bottom (totalSizeBasis width)
  // - bars for easingFactor, shift? w/range on either side for shift, potentially
  // - sliders for basis, gap, scale, falloff, >>>>>>>>> and EASING_MS
  // - line tracing the easing/size function behind the cards?
  // - pin the max value of falloff to the number of cards / 2
  // FIXME:
  // - ensure that the component can handle having too few items in it for especially the branching shift logic to work
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
          alignItems: 'flex-end',
        }}
      >
        {Children.map(children, (child, index) => {
          const gapSize = `${((1 + easingFactor * (gapSizes[index] - 1)) * gap).toFixed(2)}px`;

          return (
            <CardSize.Provider value={(1 + easingFactor * (cardSizes[index] - 1)) * basis}>
              <CardFocus.Provider value={focusHandlers[index]}>
                {/* TODO: get rid of provider flow if I stick with forcibly wrapping in Card */}
                <Card>
                  {child}
                </Card>
                {index < (totalCards - 1) && (
                  <div style={{
                    width: gapSize,
                    height: gapSize,
                    flexShrink: 0,
                  }} />
                )}
              </CardFocus.Provider>
            </CardSize.Provider>
          )
        })}
      </div>
    </ul>
  )
}

// I put a __ so it's safe and smart to do
const __animatedVariables: Record<string, string | number> = {};
const AnimatedVariable: FC<{ varName: string; displayName?: string }> = ({ varName, displayName }) => {
  const [value, setValue] = useState<string | number>(__animatedVariables[varName]);

  useEffect(() => {
    const displayNextValue = () => {
      setValue(__animatedVariables[varName]);

      frame = requestAnimationFrame(displayNextValue);
    }

    let frame = requestAnimationFrame(displayNextValue);

    return () => cancelAnimationFrame(frame);
  });

  return (
    <p>{displayName ?? varName}: {value}</p>
  );
}

export const MagnificationTester: FC<CardMagnifierProps> = ({
  children,
  direction = 'horizontal',
  scaleStrategy,
  ...carouselProps
}) => {
  // TODO: add LFO to these
  // if I add an LFO button to every animatable property -
  //   no controls just ~1/3hz using Date.now() as an input to Math.sin()
  //   w/random offset so they're not in phase
  const [scale, setScale] = useState(3);
  const [falloff, setFalloff] = useState(3);
  const [gap, setGap] = useState(5);

  return (
    <div>
      <div>
        <input
          type="range"
          id="scale"
          name="scale"
          min={1}
          // FIXME: scale values above 5 show an apparent discontinuity in the level of shift
          // through the easing animation, seems to just grow in noticeability w/large shifts
          // or gaps
          max={5}
          value={scale}
          step={0.1}
          onChange={e => setScale(e.target.valueAsNumber)}
        />
        <label htmlFor="scale">Scale</label>
      </div>
      <div>
        <input
          type="range"
          id="falloff"
          name="falloff"
          min={1}
          max={10}
          value={falloff}
          step={1.0}
          onChange={e => setFalloff(e.target.valueAsNumber)}
        />
        <label htmlFor="falloff">Falloff</label>
      </div>
      <div>
        <input
          type="range"
          id="gap"
          name="gap"
          min={0}
          max={25}
          value={gap}
          step={1.0}
          onChange={e => setGap(e.target.valueAsNumber)}
        />
        <label htmlFor="gap">Gap</label>
      </div>
      <AnimatedVariable varName="scale" />
      <AnimatedVariable varName="falloff" />
      <AnimatedVariable varName="shift" />
      <AnimatedVariable varName="maxTotalSize" />
      <AnimatedVariable varName="totalSize" />
      <AnimatedVariable varName="totalCardSize" />
      <AnimatedVariable varName="totalGapSize" />
      <AnimatedVariable varName="normMousePosition" />
      <AnimatedVariable varName="mousePosInSliceLengths" />
      <AnimatedVariable varName="easingFactor" />
      <AnimatedVariable varName="halfSizeDiff" />
      <CardMagnifier
        direction={direction}
        scaleStrategy={scaleStrategy}
        {...carouselProps}
        scale={scale}
        falloff={falloff}
        gap={gap}
      >
        {children}
      </CardMagnifier>
    </div>
  )
}
