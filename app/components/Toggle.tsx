import { FC } from 'react';
import clsx from 'clsx';

type ValueLabelProps = {
  emphasize: boolean;
  children: string;
}
const ValueLabel: FC<ValueLabelProps> = ({ emphasize, children }) => {
  return (
    <span className={clsx(
      "justify-self-start transition-all duration-200 text-sm",
      emphasize ? "slate-800 font-bold" : "slate-500 font-normal"
    )}>
      {children}
    </span>
  );
}

type ToggleProps = {
  value: boolean;
  id: string;
  label: string;
  onChange: (value: boolean) => void;
  enabledText?: string;
  disabledText?: string;
  className?: string;
}
export const Toggle: FC<ToggleProps> = ({
  value,
  id,
  label,
  onChange,
  enabledText,
  disabledText,
  className,
}) => {
  return (
    <label
      htmlFor={id}
      className={clsx("flex flex-col gap-1 font-mono", className)}
      tabIndex={0}
      onKeyUp={e => {
        if (e.key === 'Enter') onChange(!value);
      }}
    >
      <input
        type="checkbox"
        className="sr-only"
        id={id}
        onChange={() => onChange(!value)}
        checked={value}
        tabIndex={-1}
      />
      <span className="text-base/loose">
        {label}
      </span>
      <div
        className="grid grid-cols-[repeat(3,minmax(min-content,1fr))] gap-2 justify-center items-center w-min"
      >
        {disabledText && (
          <ValueLabel emphasize={!value}>
            {disabledText}
          </ValueLabel>
        )}
        {/* track */}
        <div className={clsx(
          "transition-colors duration-200",
          "p-1 border-2 rounded-full w-15 relative",
          value
            ? "bg-deep-800 border-deep-800"
            : "bg-deep-100 border-deep-500",
        )}>
          {/* thumb */}
          <div className={clsx(
            "w-6 h-6 rounded-full relative transition-all duration-200",
            value
              ? "bg-deep-100 border-deep-100 translate-x-full"
              : "bg-deep-500 border-deep-500 translate-x-0",
          )} />
        </div>
        {enabledText && (
          <ValueLabel emphasize={value}>
            {enabledText}
          </ValueLabel>
        )}
      </div>
    </label>
  );
}
