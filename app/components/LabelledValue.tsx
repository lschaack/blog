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
    <div className={`relative w-full font-geist-mono ${className}`}>
      <div className="flex justify-between gap-8">
        <label htmlFor={id} className="block">{label}</label>
        <pre>{pad ? value.padStart(pad, ' ') : value}</pre>
      </div>
      {children}
    </div>
  )
}
