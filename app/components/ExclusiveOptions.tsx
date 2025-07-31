import { createContext, ReactNode, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronUp, ChevronDown } from 'lucide-react';
import kebabCase from "lodash/kebabCase";

import { EasingDirection } from "@/app/utils/requestEasingFrames";
import { useEaseUpDown } from "@/app/hooks/useEaseUpDown";
import { useEaseTrigger } from "@/app/hooks/useEaseTrigger";
import { useOutsideClick } from "@/app/hooks/useOutsideClick";

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
          "cursor-pointer w-full block transition-colors duration-200 outline-none",
          "bg-deep-100 focus:bg-deep-200 hover:bg-deep-200",
          "p-2 flex justify-between items-center gap-2",
          isSelected ? "font-bold" : "font-normal",
          disabled && "bg-gray-100! cursor-not-allowed!",
        )}
      >
        <span>{label}</span>
        <div className="w-6 h-6" />
      </label>
    </li>
  );
}

const LEGEND_DISPLACEMENT = 5;

// TODO: This component is pretty hacky in a number of ways...
// needs some attention when I have more time
type ExclusiveOptionsProps = ExclusiveOptionsContextType & {
  children: ReactNode;
  className?: string;
}
export const ExclusiveOptions = ({
  children,
  className,
  ...context
}: ExclusiveOptionsProps) => {
  const container = useRef<HTMLDivElement>(null);
  const optionWrapper = useRef<HTMLUListElement>(null);
  const [direction, setDirection] = useState(EasingDirection.DOWN);
  const [wrapperHeight, setWrapperHeight] = useState(0);
  const [wrapperWidth, setWrapperWidth] = useState(0);
  const [firedLegendImpulse, setFiredLegendImpulse] = useState(true);

  const easingFactor = useEaseUpDown(
    100,
    direction,
    direction === EasingDirection.UP ? 'easeInOut' : 'easeIn'
  );

  const isOpen = direction === EasingDirection.UP;

  const { easingFactor: springEasingFactor, trigger: triggerSpring } = useEaseTrigger(400, 'springInPlace', 25);

  useLayoutEffect(() => {
    setWrapperHeight(optionWrapper.current?.scrollHeight ?? 0);
    setWrapperWidth(optionWrapper.current?.getBoundingClientRect().width ?? 0);
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

  useOutsideClick(container, () => toggleOpenClose(EasingDirection.DOWN), isOpen);

  const kebabName = useMemo(() => kebabCase(context.name), [context.name]);
  const legendId = `exclusive-options-${kebabName}`;
  const legendPosition = springEasingFactor * LEGEND_DISPLACEMENT;

  return (
    <ExclusiveOptionsContext.Provider value={context}>
      <div
        role="group"
        ref={container}
        aria-labelledby={legendId}
        className={clsx(
          easingFactor > 0 ? "z-20" : "z-10",
          "flex flex-col gap-1 font-geist-mono font-medium",
          wrapperWidth ? "opacity-100" : "opacity-0",
          className,
        )}
      >
        <legend id={legendId} className="shrink-0 overflow-ellipsis">
          {context.name}
        </legend>
        <div
          className={clsx(
            "w-min cursor-pointer",
            "flex flex-col justify-between items-baseline",
            "border-2 border-deep-500 bg-deep-100",
            "rounded-lg duration-100 delay-100 transition-[border-radius]",
            isOpen && "rounded-b-none duration-[0ms] delay-[0ms]",
          )}
          style={{ transform: `translateY(${-legendPosition}px)`, width: wrapperWidth }}
          onClick={() => toggleOpenClose()}
        >
          {/* menu head representing current value */}
          <div className="w-full p-2 flex justify-between items-center gap-2">
            <p>{context.value}</p>
            {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
          {/* establish a full width (including border) basis for the menu surface */}
          <div className={clsx(
            "absolute bottom-0 -left-0.5 -right-0.5 -mb-0.5",
            !isOpen && "pointer-events-none",
          )}>
            {/* create a full-height surface exactly below the head */}
            <div
              className="absolute w-full overflow-hidden"
              style={{ height: wrapperHeight }}
            >
              {/* place the menu content above the surface when closed */}
              <ul
                ref={optionWrapper}
                className="relative bottom-full w-min transition-transform duration-200 will-change-transform"
                style={{
                  height: wrapperHeight,
                  transform: direction === EasingDirection.UP ? `translateY(${wrapperHeight}px)` : `translateY(0)`
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
    </ExclusiveOptionsContext.Provider>
  )
}
