import { FC } from 'react';
import clsx from 'clsx';

type BaseButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  friendly?: boolean;
  danger?: boolean;
}

type RegularButtonProps = BaseButtonProps & {
  friendly?: never;
  danger?: never;
}

type FriendlyButtonProps = BaseButtonProps & {
  friendly?: true;
  danger?: never;
}

type DangerButtonProps = BaseButtonProps & {
  danger?: true;
  friendly?: never;
}

type ButtonProps = RegularButtonProps | FriendlyButtonProps | DangerButtonProps;

export const Button: FC<ButtonProps> = ({ label, onClick, className, disabled = false, danger = false, friendly = false }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        className,
        "text-base/loose font-geist-mono font-semibold text-text-extralight",
        "w-full p-2 rounded-[10px] cursor-pointer pop-active",
        danger
          ? "bg-red-600"
          : friendly
            ? "bg-green-600"
            : "bg-bold",
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
