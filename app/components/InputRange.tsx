import { clsx } from "clsx";
import { ChangeEventHandler, FC, useRef, useState } from "react";
import { inputColorClasses } from "@/app/utils/colors";
import { LabelledValue } from "@/app/components/LabelledValue";

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
}) => {
  const [_value, _setValue] = useState(defaultValue ?? min);
  const value = managedValue ?? _value;

  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const pad = Math.max(max.toString().length, min.toString().length);

  const percentage = ((value - min) / (max - min)) * 100;

  // Handle slider change
  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    const newValue = Number(value);
    _setValue(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <LabelledValue
      id={id}
      label={label}
      pad={pad}
      value={value.toString()}
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
