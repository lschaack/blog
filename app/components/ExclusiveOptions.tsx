import { createContext, ReactNode, RefObject, useContext, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronUp, ChevronDown } from 'lucide-react';
import kebabCase from "lodash/kebabCase";

import { EasingDirection } from "@/app/utils/requestEasingFrames";
import { useEaseUpDown } from "@/app/hooks/useEaseUpDown";
import { useEaseTrigger } from "@/app/hooks/useEaseTrigger";
import { useOutsideClick } from "@/app/hooks/useOutsideClick";

type OptionValue = string | number | readonly string[];

const LEGEND_DISPLACEMENT = 5;

type TDropdownContext = {
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: OptionValue;
  isOpen: boolean;
  toggleOpenClose: (requestDirection?: EasingDirection) => void;
  direction: EasingDirection;
  optionWrapper: RefObject<HTMLUListElement | null>;
  wrapperHeight: number;
};
const DropdownContext = createContext<TDropdownContext | null>(null);

const useDropdownContext = () => {
  const value = useContext(DropdownContext);

  if (value === null) {
    throw new Error('Cannot use dropdown context outside of a Dropdown');
  }

  return value;
}

type TDropdownItemContext = {
  value: OptionValue;
  disabled: boolean;
};
const DropdownItemContext = createContext<TDropdownItemContext | null>(null);

const useDropdownItemContext = () => {
  const value = useContext(DropdownItemContext);

  if (value === null) {
    throw new Error('Cannot use dropdown item context outside of a DropdownItem');
  }

  return value;
}

// TODO: This component is pretty hacky in a number of ways...
// needs some attention when I have more time
type DropdownProps = {
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: OptionValue;
  isOpen?: boolean;
  className?: string;
  children?: ReactNode;
};
const Dropdown = ({
  name,
  onChange,
  value,
  isOpen: forceIsOpen,
  className,
  children,
}: DropdownProps) => {
  const container = useRef<HTMLDivElement>(null);
  const optionWrapper = useRef<HTMLUListElement>(null);

  const [wrapperHeight, setWrapperHeight] = useState(0);
  const [wrapperWidth, setWrapperWidth] = useState(0);
  const [firedLegendImpulse, setFiredLegendImpulse] = useState(true);

  const [unmanagedDirection, setUnmanagedDirection] = useState(
    forceIsOpen === undefined
      ? EasingDirection.DOWN
      : forceIsOpen
        ? EasingDirection.UP
        : EasingDirection.DOWN
  );
  const direction = (
    forceIsOpen === undefined
      ? unmanagedDirection
      : forceIsOpen
        ? EasingDirection.UP
        : EasingDirection.DOWN
  );

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

      setUnmanagedDirection(nextDirection);

      if (nextDirection === EasingDirection.DOWN) {
        setFiredLegendImpulse(false);
      }
    }
  };

  useOutsideClick(container, () => toggleOpenClose(EasingDirection.DOWN), isOpen);

  const legendId = `exclusive-options-${kebabCase(name)}`;
  const legendPosition = springEasingFactor * LEGEND_DISPLACEMENT;

  return (
    <DropdownContext.Provider value={{
      name,
      onChange,
      value,
      isOpen,
      toggleOpenClose,
      direction: direction,
      optionWrapper,
      wrapperHeight,
    }}>
      {/* NOTE: not a fieldset b/c/o weird automatic legend placement behavior */}
      <div
        role="group"
        ref={container}
        aria-labelledby={legendId}
        className={clsx(
          easingFactor > 0 ? "z-20" : "z-10",
          "flex flex-col flex-wrap gap-y-1 gap-x-4 font-geist-mono font-medium",
          wrapperWidth ? "opacity-100" : "opacity-0",
          className,
        )}
      >
        <legend id={legendId} className="shrink-0 overflow-ellipsis">
          {name}
        </legend>
        <div
          className={clsx(
            "min-w-fit cursor-pointer",
            "flex flex-col justify-between items-baseline",
            "rounded-lg border-2 border-deep-500 bg-deep-100",
            "duration-100 delay-100 transition-[border-radius]",
            isOpen && "rounded-b-none duration-[0ms] delay-[0ms]",
          )}
          style={{ transform: `translateY(${-legendPosition}px)`, width: wrapperWidth }}
          onClick={() => toggleOpenClose()}
        >
          {children}
        </div>
      </div>
    </DropdownContext.Provider>
  )
};

// allow the user to pass a single icon, a pair of icons for open/closed states,
// or no icons to use the default chevrons
type BaseDropdownSurfaceProps = {
  children?: ReactNode;
};
type DropdownSurfacePropsWithoutIcon = BaseDropdownSurfaceProps & {
  iconMode?: 'none';
  icon?: never;
  openIcon?: never;
  closedIcon?: never;
}
type DropdownSurfacePropsWithIcon = BaseDropdownSurfaceProps & {
  iconMode?: 'single';
  icon: ReactNode;
  openIcon?: never;
  closedIcon?: never;
}
type DropdownSurfacePropsWithOpenCloseIcon = BaseDropdownSurfaceProps & {
  iconMode?: 'toggle';
  icon?: never;
  openIcon: ReactNode;
  closedIcon: ReactNode;
}
type DropdownSurfaceProps =
  | DropdownSurfacePropsWithoutIcon
  | DropdownSurfacePropsWithIcon
  | DropdownSurfacePropsWithOpenCloseIcon;
const DropdownSurface = ({
  children,
  icon,
  openIcon = <ChevronUp size={24} />,
  closedIcon = <ChevronDown size={24} />,
}: DropdownSurfaceProps) => {
  const { isOpen } = useDropdownContext();
  const currIcon = icon ?? isOpen ? openIcon : closedIcon;

  return (
    <div className="w-full min-w-fit p-2 flex justify-between items-center gap-2">
      {children}
      {currIcon}
    </div>
  )
};

type DropdownListProps = { children?: ReactNode };
const DropdownList = ({
  children,
}: DropdownListProps) => {
  const { isOpen, toggleOpenClose, direction, optionWrapper, wrapperHeight } = useDropdownContext();

  return (
    // establish a full width (including border) basis for the menu surface *
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
          className="w-full relative bottom-full transition-transform duration-200 will-change-transform"
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
  );
};

type DropdownItemProps = {
  value: OptionValue;
  disabled?: boolean;
  children?: ReactNode;
};
const DropdownItem = ({
  value,
  disabled,
  children,
}: DropdownItemProps) => {
  const { value: currValue } = useDropdownContext();
  const isSelected = value === currValue;

  return (
    <DropdownItemContext.Provider value={{ value, disabled: disabled ?? false }}>
      <li className={clsx(
        "overflow-hidden text-ellipsis whitespace-nowrap",
        "border-deep-500 border-x-2 last-of-type:border-b-2 last-of-type:rounded-b-lg",
        "focus-within:bg-deep-200 hover:bg-deep-200",
        "transition-colors duration-200",
        isSelected ? "font-bold" : "font-normal",
        disabled
          ? "cursor-not-allowed! bg-neutral-200! text-neutral-500 pointer-events-none "
          : "cursor-pointer bg-deep-100 pointer-events-auto",
      )}>
        {children}
      </li>
    </DropdownItemContext.Provider>
  );
};

type DropdownRadioOptionProps = {
  children: ReactNode;
};
const DropdownRadioOption = ({ children }: DropdownRadioOptionProps) => {
  const { name, value: currValue, onChange } = useDropdownContext();
  const { value, disabled } = useDropdownItemContext();

  const isSelected = value === currValue;
  const id = `${name}-${value}`;

  return (
    <>
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
          "w-full block outline-none",
          "p-2 flex justify-between items-center gap-2",
        )}
      >
        <span>{children ?? value}</span>
      </label>
    </>
  )
}

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
  return (
    <DropdownItem value={value} disabled={disabled}>
      <DropdownRadioOption>
        {label}
      </DropdownRadioOption>
    </DropdownItem>
  );
}

type ExclusiveOptionsProps = Pick<DropdownProps, 'name' | 'onChange' | 'value'> & {
  children: ReactNode;
  className?: string;
}
export const ExclusiveOptions = ({
  name,
  onChange,
  value,
  className,
  children,
}: ExclusiveOptionsProps) => {
  return (
    <Dropdown
      name={name}
      value={value}
      onChange={onChange}
      className={className}
    >
      <DropdownSurface>
        <p>{value}</p>
      </DropdownSurface>

      <DropdownList>
        {children}
      </DropdownList>
    </Dropdown>
  );
}
