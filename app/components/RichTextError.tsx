import { FC, ReactNode } from "react";

export const RichTextError: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <p className="w-full p-2 font-geist-mono font-bold bg-black text-prickly-pear-200">
      {children}
    </p>
  );
}
