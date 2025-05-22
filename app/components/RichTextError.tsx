import { FC, ReactNode } from "react";

export const RichTextError: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <p className="w-full p-2 font-geist-mono text-red-500">
      {children}
    </p>
  );
}
