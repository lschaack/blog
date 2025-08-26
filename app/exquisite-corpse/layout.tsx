import { ReactNode } from "react";
import clsx from 'clsx';

type GameLayoutProps = { children: ReactNode };
export default function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className={clsx(
      "p-6 rounded-4xl h-fit max-w-full flex justify-center items-center bg-slate-50/95",
      "transition-opacity duration-200 opacity-0 not-empty:opacity-100",
    )}>
      {children}
    </div>
  );
}
