import { ChangeEventHandler, FC, useState } from "react";
import clamp from "lodash/clamp";

import clsx from "clsx";

type InputNumberProps = {
  label: string;
  id: string;
  min: number;
  max: number;
  defaultValue?: number;
  value?: number;
  onChange: (value: number) => void;
  className?: string;
}

export const InputNumber: FC<InputNumberProps> = ({
  label,
  id,
  min,
  max,
  defaultValue,
  value: managedValue,
  onChange,
  className,
}) => {
  const [_value, _setValue] = useState(defaultValue ?? min);
  const value = managedValue ?? _value;

  const size = Math.max(max.toString().length, min.toString().length);

  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    const nextValue = clamp(Number(value), min, max);

    _setValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div className={clsx(
      "text-base/loose font-geist-mono font-medium relative flex flex-col gap-1",
      className
    )}>
      <label htmlFor={id} className="block">{label}</label>
      <input
        tabIndex={0}
        type="number"
        id={id}
        min={min}
        max={max}
        size={size}
        value={value}
        onChange={handleChange}
        className={clsx(
          "border-deep-500 border-2",
          "px-1.5 w-min cursor-pointer z-10 bg-slate-50 rounded-lg")}
      />
    </div>
  );
}

