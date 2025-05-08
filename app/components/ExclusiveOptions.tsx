import { createContext, ReactNode, useContext, useRef, useState } from "react";
import clsx from "clsx";

import { inputColorClasses } from "@/app/utils/colors";
import { EasingDirection } from "@/app/utils/requestEasingFrames";
import { useEaseUpDown } from "@/app/hooks/useEaseUpDown";
import { useEaseTrigger } from "@/app/hooks/useEaseTrigger";

type OptionValue = string | number | readonly string[];

type ExclusiveOptionsContextType = {
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color: keyof typeof inputColorClasses;
  value: OptionValue;
}
const ExclusiveOptionsContext = createContext<ExclusiveOptionsContextType | null>(null);

type OptionProps<T extends OptionValue> = {
  value: T;
  label: string;
  disabled?: boolean;
}
export const Option = <T extends OptionValue>({
  value,
  label,
  disabled,
}: OptionProps<T>) => {
  const context = useContext(ExclusiveOptionsContext);

  if (!context) {
    throw new Error('Option must be used within an ExclusiveOptions');
  }

  const { name, onChange, value: currValue } = context;
  const id = `${name}-${value}`;
  const isSelected = value === currValue;

  return (
    <div>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        className="sr-only"
        disabled={disabled}
        checked={isSelected}
      />
      <label
        htmlFor={id}
        className={clsx(
          "cursor-pointer w-full p-2 block transition-colors duration-200",
          inputColorClasses[context.color].track,
          isSelected && inputColorClasses[context.color].filled,
          isSelected && "text-white",
          disabled && "bg-gray-100! cursor-not-allowed!",
        )}
      >
        {label}
      </label>
    </div>
  );
}

const LEGEND_DISPLACEMENT = 5;

type ExclusiveOptionsProps = ExclusiveOptionsContextType & {
  children: ReactNode;
}
export const ExclusiveOptions = ({
  children,
  ...context
}: ExclusiveOptionsProps) => {
  const optionWrapper = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(EasingDirection.DOWN);
  const [firedLegendImpulse, setFiredLegendImpulse] = useState(true);
  const easingFactor = useEaseUpDown(
    300,
    direction,
    direction === EasingDirection.UP ? 'easeInOut' : 'easeIn'
  );

  const { easingFactor: springEasingFactor, trigger: triggerSpring } = useEaseTrigger(400, 'springInPlace')

  if (easingFactor === 0 && !firedLegendImpulse) {
    setFiredLegendImpulse(true);
    triggerSpring();
  }

  const wrapperHeight = easingFactor * (optionWrapper.current?.scrollHeight ?? 0);
  const legendPosition = springEasingFactor * LEGEND_DISPLACEMENT;

  return (
    <ExclusiveOptionsContext.Provider value={context}>
      <fieldset className="flex flex-col font-mono">
        <div
          className="w-full h-full cursor-pointer flex gap-8 justify-between items-baseline"
          style={{ transform: `translateY(${-legendPosition}px)` }}
          onClick={() => {
            const nextDirection = direction === EasingDirection.DOWN
              ? EasingDirection.UP
              : EasingDirection.DOWN;
            setDirection(nextDirection);

            if (nextDirection === EasingDirection.DOWN) {
              setFiredLegendImpulse(false);
            }
          }}
        >
          <legend
            className={clsx(
              "font-bold p-1 border-l-4",
              inputColorClasses[context.color].border,
            )}
          >
            {context.name}
          </legend>
          <p>{context.value}</p>
        </div>
        <div ref={optionWrapper} className="overflow-hidden" style={{ height: wrapperHeight }}>
          {children}
        </div>
      </fieldset>
    </ExclusiveOptionsContext.Provider>
  )
}
