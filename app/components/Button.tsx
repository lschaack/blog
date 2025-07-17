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
        "text-base/loose text-text-extralight font-geist-mono font-semibold",
        "w-full p-2 rounded-[10px] cursor-pointer bg-bold",
        "pop-active",
      )}
    >
      {label}
    </button>
  );
}
