import { clsx } from "clsx";
import { ChangeEventHandler, FC, useRef, useState } from "react";
import { compressRangeSymmetric } from "@/app/utils/range";
import { inputColorClasses } from "@/app/utils/colors";
import { LabelledValue } from "./LabelledValue";

const THUMB_WIDTH_PX = 16;

type InputRangeProps = {
  label: string;
  color: keyof typeof inputColorClasses;
  id: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
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
  onChange,
  className,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Compress percentage range using proportional thumb width to prevent
  // left and right edge of thumb from going outside of track
  const thumbWidth = THUMB_WIDTH_PX / (trackRef.current?.clientWidth ?? 1);
  const percentage = compressRangeSymmetric(((value - min) / (max - min)), -thumbWidth) * 100;

  // Handle slider change
  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    const newValue = Number(value);
    setValue(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <LabelledValue
      id={id}
      label={label}
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

        {/* Custom thumb */}
        <div
          className={clsx(
            'absolute w-4 h-4',
            'transform -translate-y-1/2 -translate-x-1/2',
            'transition-[box-shadow,background-color] duration-200',
            isDragging ? inputColorClasses[color].thumbActive : inputColorClasses[color].thumb,
            isFocused && inputColorClasses[color].focused,
          )}
          style={{
            left: `${percentage}%`,
            top: '50%',
          }}
        />
      </div>
    </LabelledValue>
  );
}
