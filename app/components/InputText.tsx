import { ChangeEventHandler } from "react";
import clsx from 'clsx';

type InputTextProps = {
  className?: string;
  label: string;
  id: string;
  value: string;
  placeholder?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  maxLength?: number;
  hideLabel?: boolean;
}
export function InputText({
  className,
  label,
  id,
  value,
  placeholder,
  onChange,
  disabled = false,
  maxLength,
  hideLabel = false,
}: InputTextProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={clsx(
          "block text-sm font-medium text-gray-700 mb-1",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full focus:outline-none"
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  )
}
