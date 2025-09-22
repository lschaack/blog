"use client";

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'motion/react';

type BaseButtonProps = {
  label: ReactNode;
  onClick?: () => void;
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
    <motion.button
      onClick={onClick}
      className={clsx(
        className,
        "text-base/loose font-geist-mono font-semibold text-nowrap text-text-extralight",
        "w-full py-2 px-3 rounded-[10px]",
        danger
          ? "bg-red-600"
          : friendly
            ? "bg-green-600"
            : "bg-bold",
        // FIXME: Get colors sorted out so I don't have to do this
        !danger && "disabled:brightness-200",
        "disabled:contrast-50 disabled:cursor-not-allowed not:disabled:cursor-pointer",
      )}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: 1 }}
      disabled={disabled}
    >
      {label}
    </motion.button>
  );
}
