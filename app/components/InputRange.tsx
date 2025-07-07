import { clsx } from "clsx";
import { ChangeEventHandler, FC, KeyboardEventHandler, useRef, useState } from "react";
import { clamp } from "lodash";

import { LabelledValue } from "@/app/components/LabelledValue";
import { easify, EASING_STRATEGY, EasingStrategy } from "@/app/utils/easingFunctions";
import { roundToPrecision } from "@/app/utils/roundToPrecision";
import { normalize } from "@/app/utils/range";

type InputRangeProps = {
  label: string;
  id: string;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
  value?: number;
  onChange: (value: number) => void;
  className?: string;
  trackClassName?: string;
  easing?: EasingStrategy;
}

export const InputRange: FC<InputRangeProps> = ({
  label,
  id,
  min,
  max,
  step,
  defaultValue,
  value: managedValue,
  onChange,
  className,
  easing,
}) => {
  const [_value, _setValue] = useState(defaultValue ?? min);
  const value = managedValue ?? _value;

  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const pad = Math.max(max.toString().length, min.toString().length);

  // Handle slider change
  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    // This is kind of a hack to use browser logic for the underlying input element
    // When dragging, this handler fires with the target value at the point on the track
    // where the cursor is positioned. On mouse up, it fires again with the actual value
    // passed to the input element.
    //
    // That probably means this implementation is vulnerable to changes in browser
    // implementation of the input element, so at some point I should really make this
    // fully custom with an sr-only input...TODO: I guess
    if (isDragging) {
      const rawValue = Number(value);
      const newValue = easing
        ? easify(rawValue, min, max, EASING_STRATEGY[easing].ease)
        : rawValue;

      _setValue(newValue);
      if (onChange) onChange(newValue);
    }
  };

  // FIXME: Downstream of the handleChange weirdness,
  // need to manually handle keyboard changes b/c/o isDragging check above...
  // some true lazy tech debt for after the initial release
  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    let newValue: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      newValue = clamp(value + step, min, max);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      newValue = clamp(value - step, min, max);
    } else {
      newValue = NaN;
    }

    if (!isNaN(newValue)) {
      _setValue(newValue);
      if (onChange) onChange(newValue);
    }
  }

  const rawNorm = normalize(value, min, max);
  // If value is eased, we need to "undo" the easing for the thumb to move linearly
  // in the visual presentation
  const norm = easing
    ? EASING_STRATEGY[easing].inverse(rawNorm)
    : rawNorm;
  const percentage = norm * 100;

  return (
    <LabelledValue
      id={id}
      label={label}
      pad={pad}
      value={roundToPrecision(value, 4).toString()}
      className={className}
    >
      {/* Custom track */}
      <div ref={trackRef} className="pop-focus-within relative w-full h-6 rounded-sm bg-light">
        <input
          tabIndex={0}
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onKeyDown={handleKeyDown}
          className="opacity-0 peer absolute w-full h-full cursor-pointer z-10"
          onBlur={() => {
            setIsDragging(false);
          }}
        />


        {/* Smaller track to limit thumb to left/right edges */}
        <div className="relative w-full px-2">
          {/* Filled portion */}
          <div
            className="absolute h-full bg-medium -ml-2 rounded-l-sm"
            style={{ width: `${percentage}%` }}
          />

          {/* Custom thumb */}
          <div
            className={clsx(
              'relative w-3 h-6 rounded-xs bg-bold',
              // TODO: the ring rounding looks a little funky somehow
              'ring-2 ring-bold',
              'transform -translate-x-1/2',
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    </LabelledValue>
  );
}
