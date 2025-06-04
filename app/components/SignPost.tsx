"use client";

import { FC, ReactNode, useState } from "react";
import clsx from 'clsx';

export const SignPost: FC<{ children?: ReactNode }> = ({ children }) => {
  const [animate, setAnimate] = useState(false);
  const [enableHover, setEnableHover] = useState(true);

  return (
    <div
      className="group"
      onClick={() => {
        if (!animate) {
          setAnimate(true);
          setTimeout(() => setEnableHover(false), 300);
        }
      }}
      onMouseMove={() => {
        // Handle bug where user clicks and keeps mouse over the surface, resulting in a
        // discontinuous jump to the group-hover rotation transform at the end of the animation
        if (!enableHover && !animate) setEnableHover(true);
      }}
    >
      <div
        className={clsx(
          "perspective-normal",
          "rotate-x-[8deg] -rotate-y-20",
          "transition-transform",
          enableHover && "group-hover:-rotate-y-30",
          animate && "animate-twist",
        )}
        onAnimationEnd={() => setAnimate(false)}
      >
        {children}
      </div>
    </div>
  );
}
