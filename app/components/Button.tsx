import { FC, useState } from 'react';
import clsx from 'clsx';

import { inputColorClasses } from "@/app/utils/colors";

type ButtonProps = {
  color: keyof typeof inputColorClasses;
  label: string;
  onClick: () => void;
}

export const Button: FC<ButtonProps> = ({ color, label, onClick }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);

  return (
    <button
      onClick={onClick}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseOut={() => setIsActive(false)}
      className={clsx(
        "w-full p-2 font-geist-mono cursor-pointer transition-colors duration-200",
        "focus:outline-0",
        inputColorClasses[color].track,
        isFocused && inputColorClasses[color].altFocused,
        isActive && inputColorClasses[color].filled,
      )}
    >
      {label}
    </button>
  );
}
