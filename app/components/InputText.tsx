import { ChangeEventHandler } from "react";

type InputTextProps = {
  className?: string;
  label: string;
  id: string;
  value: string;
  placeholder?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  maxLength?: number;
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
}: InputTextProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  )
}
