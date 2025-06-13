import { clsx } from "clsx";
import { ChangeEventHandler, FC, useRef, useState } from "react";

import { inputColorClasses } from "@/app/utils/colors";
import { LabelledValue } from "@/app/components/LabelledValue";
import { easify, EASING_STRATEGY, EasingStrategy } from "@/app/utils/easingFunctions";
import { roundToPrecision } from "@/app/utils/roundToPrecision";
import { normalize } from "@/app/utils/range";

type InputRangeProps = {
  label: string;
  color: keyof typeof inputColorClasses;
  id: string;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
  value?: number;
  onChange: (value: number) => void;
  className?: string;
  easing?: EasingStrategy;
}

export const InputRange: FC<InputRangeProps> = ({
  label,
  id,
  color,
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
  const [isFocused, setIsFocused] = useState(false);
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
        className="absolute w-full opacity-0 cursor-pointer z-10"
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsDragging(false);
          setIsFocused(false);
        }}
      />

      {/* Custom track */}
      <div className={`relative w-full h-4 ${inputColorClasses[color].track}`} ref={trackRef}>
        {/* Filled portion */}
        <div
          className={`absolute h-full ${inputColorClasses[color].filled}`}
          style={{ width: `${percentage}%` }}
        />

        {/* Smaller track to limit thumb to left/right edges */}
        <div className="relative w-full h-full px-2">
          {/* Custom thumb */}
          <div
            className={clsx(
              'relative w-4 h-4',
              'transform -translate-x-1/2',
              'transition-[box-shadow,background-color] duration-200',
              isDragging ? inputColorClasses[color].thumbActive : inputColorClasses[color].thumb,
              isFocused && inputColorClasses[color].focused,
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    </LabelledValue>
  );
}
