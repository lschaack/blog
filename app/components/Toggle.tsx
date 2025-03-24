import { FC } from 'react';
import clsx from 'clsx';

import { inputColorClasses } from "@/app/utils/colors";

type ToggleProps = {
  color: keyof typeof inputColorClasses;
  value: boolean;
  id: string;
  label: string;
  onChange: (value: boolean) => void;
}

export const Toggle: FC<ToggleProps> = ({ color, value, id, label, onChange }) => {
  return (
    <div className="w-full">
      <input
        type="checkbox"
        className="sr-only"
        id={id}
        onChange={() => onChange(!value)}
        checked={value}
      />
      <label
        htmlFor={id}
        className={clsx(
          "w-full p-2 block font-mono cursor-pointer transition-colors duration-200",
          inputColorClasses[color].track,
          value && inputColorClasses[color].filled,
          value && "text-white",
        )}
      >
        {label}
      </label>
    </div>
  );
}
