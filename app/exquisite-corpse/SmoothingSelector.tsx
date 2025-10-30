import { createContext, ReactNode, useContext, useEffect, useId, useRef, useState } from "react";
import { RadioGroup } from "radix-ui";
import { motion } from "motion/react";

import { Coarse } from "../custom-icons/coarse";
import { SemiSmooth } from "../custom-icons/semi-smooth";
import { Smooth } from "../custom-icons/smooth";

type TRadioRowContext<T extends string = string> = {
  rowId: string;
  currentValue: T;
};
const RadioRowContext = createContext<TRadioRowContext | null>(null);

type RadioRowProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}
function RadioRow<T extends string>({ value, onChange, children }: RadioRowProps<T>) {
  const rowId = useId();

  return (
    <RadioGroup.Root
      onValueChange={onChange}
      orientation="horizontal"
      value={value}
    >
      <div className="flex rounded-lg bg-deep-500">
        <RadioRowContext.Provider value={{
          rowId,
          currentValue: value,
        }}>
          {children}
        </RadioRowContext.Provider>
      </div>
    </RadioGroup.Root>
  );
}

type RadioRowButtonProps<T extends string> = {
  value: T;
  label: T;
  children: ReactNode;
}
function RadioRowButton<T extends string>({ value, label, children }: RadioRowButtonProps<T>) {
  const id = useId();
  const rowContext = useContext(RadioRowContext);
  const checkedBackgroundRef = useRef<HTMLDivElement>(null);
  const [hasRendered, setHasRendered] = useState(false);

  // TODO: use the motion hook API to get rid of this jank
  // basically I want the animation to start at scale 2, but not when the page loads
  useEffect(() => setHasRendered(true), []);

  if (!rowContext) {
    throw new Error('RadioRowButton cannot be used outside of a RadioRow');
  }

  const { rowId, currentValue } = rowContext;
  const checked = value === currentValue;


  return (
    <motion.div
      // motion seems to set tabIndex = 0 alongside certain while_ properties
      tabIndex={-1}
      whileHover={{ scale: checked ? 1 : 1.05 }}
      whileFocus={{ scale: checked ? 1 : 1.05 }}
      whileTap={{ scale: checked ? 1 : 0.95 }}
      transition={{
        type: "spring",
        bounce: 0.5,
        duration: 0.4,
      }}
    >
      <RadioGroup.Item
        className="relative text-deep-100 p-2 rounded-lg"
        value={value}
        id={id}
      >
        {checked && (
          <motion.div
            ref={checkedBackgroundRef}
            layout
            layoutId={`radio-checked-${rowId}`}
            className="absolute inset-0 bg-deep-800 rounded-lg"
            initial={{ scale: hasRendered ? 2 : 1 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              duration: 0.25,
              bounce: 0.3
            }}
          />
        )}
        <div className="relative">
          <label className="sr-only" htmlFor={id}>
            {label}
          </label>
          {children}
        </div>
      </RadioGroup.Item>
    </motion.div>
  );
}

export type SmoothingLevel = "coarse" | "normal" | "smooth";
export const SmoothingLevelToError: Record<SmoothingLevel, number> = {
  "coarse": 10,
  "normal": 50,
  "smooth": 1000,
}

export type SmoothingSelectorProps = {
  value: SmoothingLevel;
  onChange: (value: SmoothingLevel) => void;
}
export function SmoothingSelector({ value, onChange }: SmoothingSelectorProps) {
  return (
    <RadioRow onChange={onChange} value={value}>
      <RadioRowButton value="coarse" label="Set smoothing to coarse">
        <Coarse className="stroke-deep-50" />
      </RadioRowButton>
      <RadioRowButton value="normal" label="Set smoothing to normal">
        <SemiSmooth className="stroke-deep-50" />
      </RadioRowButton>
      <RadioRowButton value="smooth" label="Set smoothing to smooth">
        <Smooth className="stroke-deep-50" />
      </RadioRowButton>
    </RadioRow>
  )
}
