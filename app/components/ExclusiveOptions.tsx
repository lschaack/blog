import { createContext, ReactNode, useContext } from "react";
import clsx from "clsx";

import { inputColorClasses } from "@/app/utils/colors";

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

type ExclusiveOptionsProps = ExclusiveOptionsContextType & {
  children: ReactNode;
}
export const ExclusiveOptions = ({
  children,
  ...context
}: ExclusiveOptionsProps) => {
  return (
    <ExclusiveOptionsContext.Provider value={context}>
      <fieldset className="flex flex-col font-mono">
        <legend className={clsx(
          "font-mono font-bold p-1 border-l-4",
          inputColorClasses[context.color].border,
        )}>
          {context.name}
        </legend>
        {children}
      </fieldset>
    </ExclusiveOptionsContext.Provider>
  )
}
