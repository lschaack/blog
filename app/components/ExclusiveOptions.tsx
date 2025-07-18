import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { EasingDirection } from "@/app/utils/requestEasingFrames";
import { useEaseUpDown } from "@/app/hooks/useEaseUpDown";
import { useEaseTrigger } from "@/app/hooks/useEaseTrigger";

type OptionValue = string | number | readonly string[];

type ExclusiveOptionsContextType = {
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    <li className={clsx(
      "overflow-hidden w-full",
      "border-deep-500 border-x-2 last-of-type:border-b-2 last-of-type:rounded-b-lg",
    )}>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        tabIndex={-1}
        className="sr-only"
        disabled={disabled}
        checked={isSelected}
      />
      <label
        htmlFor={id}
        tabIndex={disabled ? -1 : 0}
        onKeyUp={e => {
          if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click();
        }}
        className={clsx(
          "cursor-pointer w-full p-2 block transition-colors duration-200 outline-none",
          "bg-deep-100 focus:bg-deep-200",
          isSelected ? "font-bold" : "font-normal",
          disabled && "bg-gray-100! cursor-not-allowed!",
        )}
      >
        {label}
      </label>
    </li>
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
  const optionWrapper = useRef<HTMLUListElement>(null);
  const [direction, setDirection] = useState(EasingDirection.DOWN);
  const [wrapperHeight, setWrapperHeight] = useState(0);
  const [firedLegendImpulse, setFiredLegendImpulse] = useState(true);
  const easingFactor = useEaseUpDown(
    100,
    direction,
    direction === EasingDirection.UP ? 'easeInOut' : 'easeIn'
  );

  const isOpen = direction === EasingDirection.UP;

  const { easingFactor: springEasingFactor, trigger: triggerSpring } = useEaseTrigger(400, 'springInPlace')

  useEffect(() => {
    setWrapperHeight(optionWrapper.current?.scrollHeight ?? 0);
  }, []);

  if (easingFactor === 0 && !firedLegendImpulse) {
    setFiredLegendImpulse(true);
    triggerSpring();
  }

  const toggleOpenClose = (requestDirection?: EasingDirection) => {
    if (!requestDirection || requestDirection !== direction) {
      const nextDirection = requestDirection ?? (
        // If no requested direction, toggle previous
        direction === EasingDirection.DOWN
          ? EasingDirection.UP
          : EasingDirection.DOWN
      );
      setDirection(nextDirection);

      if (nextDirection === EasingDirection.DOWN) {
        setFiredLegendImpulse(false);
      }
    }
  };

  const legendPosition = springEasingFactor * LEGEND_DISPLACEMENT;

  return (
    <ExclusiveOptionsContext.Provider value={context}>
      <fieldset className="flex flex-col gap-1 font-geist-mono contain-layout">
        <div className="flex justify-between text-base/loose">
          <legend>
            {context.name}
          </legend>
          <pre>
            {context.value}
          </pre>
        </div>
        <div
          className={clsx(
            "w-full cursor-pointer",
            "flex flex-col justify-between items-baseline",
            "border-2 border-deep-500 bg-deep-100",
            "rounded-lg duration-100 delay-100 transition-[border-radius]",
            isOpen && "rounded-b-none duration-[0ms] delay-[0ms]",
          )}
          style={{ transform: `translateY(${-legendPosition}px)` }}
          onClick={() => toggleOpenClose()}
        >
          <p className="p-2">{context.value}</p>
          <div className="absolute bottom-0 -left-0.5 -right-0.5">
            <div className="relative w-full">
              <div className="absolute w-full overflow-hidden" style={{ height: wrapperHeight }}>
                <ul
                  ref={optionWrapper}
                  className="absolute w-full transition-transform duration-200"
                  style={{
                    height: wrapperHeight,
                    transform: direction === EasingDirection.UP ? `translateY(0)` : `translateY(-${wrapperHeight}px)`
                  }}
                  onFocus={() => toggleOpenClose(EasingDirection.UP)}
                  onBlur={e => {
                    const isLeavingOptionList = !optionWrapper.current?.contains(e.relatedTarget);

                    if (isLeavingOptionList) {
                      toggleOpenClose(EasingDirection.DOWN)
                    }
                  }}
                >
                  {children}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </fieldset>
    </ExclusiveOptionsContext.Provider>
  )
}
