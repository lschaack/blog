import { FC, ReactNode } from "react";

type LabelledValueProps = {
  id: string;
  label: string;
  value: string;
  children: ReactNode;
  className?: string;
}

export const LabelledValue: FC<LabelledValueProps> = ({ id, label, value, className, children }) => {
  return (
    <div className={`relative w-full font-geist-mono ${className}`}>
      <div className="flex justify-between gap-8">
        <label htmlFor={id} className="block">{label}</label>
        <p>{value}</p>
      </div>
      {children}
    </div>
  )
}
