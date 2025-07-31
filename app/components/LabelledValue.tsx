import clsx from "clsx";
import { FC, ReactNode } from "react";

type LabelledValueProps = {
  id: string;
  label: string;
  value: string;
  pad?: number;
  children: ReactNode;
  className?: string;
}

export const LabelledValue: FC<LabelledValueProps> = ({ id, label, value, pad, className, children }) => {
  return (
    <div className={clsx(
      'relative w-full flex flex-col gap-1',
      className
    )}>
      <div className="flex justify-between gap-8 text-base/loose font-geist-mono font-medium">
        <label htmlFor={id} className="block">{label}</label>
        <pre>{pad ? value.padStart(pad, ' ') : value}</pre>
      </div>
      {children}
    </div>
  )
}
