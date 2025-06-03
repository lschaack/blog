"use client";

import { FC, ReactNode, useState } from "react";
import clsx from 'clsx';

export const SignPost: FC<{ children?: ReactNode }> = ({ children }) => {
  const [animate, setAnimate] = useState(false);

  return (
    <div
      className={clsx(
        "perspective-normal",
        "rotate-x-[8deg] -rotate-y-20",
        //"transition-transform",
        //"hover:-rotate-y-30",
        animate && "animate-twist",
      )}
      onClick={() => {
        if (!animate) setAnimate(true);
      }}
      onAnimationEnd={() => setAnimate(false)}
    >
      {children}
    </div>
  );
}
