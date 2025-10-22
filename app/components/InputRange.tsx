import { clsx } from "clsx";
import { ChangeEventHandler, FC, useCallback, useRef, useState } from "react";

import { LabelledValue } from "@/app/components/LabelledValue";
import { EASING_STRATEGY, EasingStrategy } from "@/app/utils/easingFunctions";
import { roundToPrecision } from "@/app/utils/precision";
import { denormalize, normalize } from "@/app/utils/range";

type InputRangeProps = {
  label: string;
  id: string;
  min: number;
  max: number;
  value?: number;
  // number of steps from min to max, e.g. granularity 100 means 100 steps
  step: number;
  defaultValue?: number;
  onChange: (value: number) => void;
  className?: string;
  trackClassName?: string;
  easing?: EasingStrategy;
  precision?: number;
}

// TODO: API possibility - provide central value for easing !== 'linear'
// and do inverse calculation to find the corresponding elbow value
export const InputRange: FC<InputRangeProps> = ({
  label,
  id,
  min,
  max,
  value: managedValue,
  step: outputStep,
  defaultValue,
  onChange,
  className,
  easing = 'linear',
  precision,
}) => {
  const toOutputRange = useCallback(
    (internalValue: number) => denormalize(EASING_STRATEGY[easing].ease(internalValue), min, max),
    [easing, min, max]
  );

  const fromOutputRange = useCallback(
    (externalValue: number) => EASING_STRATEGY[easing].inverse(normalize(externalValue, min, max)),
    [easing, min, max]
  );

  const internalStep = outputStep / (max - min);

  const [_internalValue, _setInternalValue] = useState(fromOutputRange(defaultValue ?? min));
  const value = managedValue ? fromOutputRange(managedValue) : _internalValue

  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const pad = Math.max(max.toString().length, min.toString().length);

  const handleChange: ChangeEventHandler<HTMLInputElement> = e => {
    const rawValue = Number(e.target.value);
    const outputValue = toOutputRange(rawValue);

    _setInternalValue(Number(rawValue));
    onChange(outputValue);
  };

  const percentage = value * 100;

  return (
    <LabelledValue
      id={id}
      label={label}
      pad={pad}
      value={roundToPrecision(toOutputRange(value), precision).toString()}
      className={className}
    >
      {/* Custom track */}
      <div ref={trackRef} className="relative w-full h-6 rounded-sm bg-light group">
        <input
          tabIndex={0}
          type="range"
          id={id}
          min={0}
          max={1}
          step={internalStep}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onFocus={() => setIsDragging(true)}
          onBlur={() => setIsDragging(false)}
          className="opacity-0 peer absolute w-full h-full cursor-pointer z-10"
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
              'pop-group-hover',
              isDragging && 'pop',
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    </LabelledValue>
  );
}
