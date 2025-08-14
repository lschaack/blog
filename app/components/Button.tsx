import { FC } from 'react';
import clsx from 'clsx';

type ButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  danger?: boolean;
}

export const Button: FC<ButtonProps> = ({ label, onClick, className, disabled = false, danger = false }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        className,
        "text-base/loose font-geist-mono font-semibold",
        "w-full p-2 rounded-[10px] cursor-pointer pop-active",
        danger
          ? "text-text-extralight bg-prickly-pear-400 saturate-150"
          : "text-text-extralight bg-bold",
        // FIXME: Get colors sorted out so I don't have to do this
        !danger && "disabled:brightness-200",
        "disabled:contrast-50 disabled:cursor-not-allowed",
      )}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
