import { FC } from 'react';
import clsx from 'clsx';

type ButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
}

export const Button: FC<ButtonProps> = ({ label, onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        className,
        "text font-geist-mono font-bold",
        "w-full p-2 cursor-pointer transition-[background-color,filter,box-shadow] duration-200",
        "bg-night-owl-literal/50 ring-night-owl-literal",
        "focus:outline-0 focus:ring-4",
        "brightness-125",
        "active:brightness-75 active:saturate-200",
      )}
    >
      {label.toLocaleUpperCase()}
    </button>
  );
}
