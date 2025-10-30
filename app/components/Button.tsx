"use client";

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'motion/react';

type BaseButtonProps = {
  label: string;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  pending?: boolean;
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

export type ButtonProps = RegularButtonProps | FriendlyButtonProps | DangerButtonProps;

export const Button: FC<ButtonProps> = ({
  label,
  onClick,
  className,
  pending = false,
  disabled = false,
  danger = false,
  friendly = false,
  children,
}) => {
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
        pending && "animate-pulse",
        !pending && "disabled:contrast-50",
        "disabled:cursor-not-allowed not:disabled:cursor-pointer",
        "touch-manipulation",
      )}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileFocus={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: "spring",
        bounce: 0.5,
        duration: 0.4,
      }}
      disabled={disabled || pending}
      aria-label={label}
    >
      {children ?? label}
    </motion.button>
  );
}
