import { DetailedHTMLProps, FC, HTMLInputTypeAttribute, InputHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import clsx from 'clsx';

type IconButtonProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
  onClick: MouseEventHandler;
  children?: ReactNode;
  className?: string;
  type?: HTMLInputTypeAttribute;
  name: string;
  label: string;
}
export const IconButton: FC<IconButtonProps> = ({
  onClick,
  children,
  className,
  type = 'button',
  label,
  ...inputProps
}) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full p-2",
        "outline-4 transition-colors duration-200",
        className,
      )}
    >
      <label>
        <input
          className="sr-only"
          type={type}
          {...inputProps}
        />
        {children}
        <span className="sr-only">{label}</span>
      </label>
    </button>
  );

}
