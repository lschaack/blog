"use client";

import { FC, ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from 'clsx';

export const SignPost: FC<{ children?: ReactNode }> = ({ children }) => {
  const [animate, setAnimate] = useState(false);
  const [enableHover, setEnableHover] = useState(true);
  const pathname = usePathname();
  const isHomepage = pathname === '/';
  const [useLongerAnimation, setUseLongerAnimation] = useState(isHomepage);

  useEffect(() => {
    if (!animate) setUseLongerAnimation(isHomepage);
  }, [isHomepage, animate]);

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
          // Including transition during twist animation makes safari performance
          // choppy and causes visible reset after the last keyframe
          !animate && "transition-transform",
          animate && "will-change-transform",
          enableHover && "group-hover:-rotate-y-30 group-hover:will-change-transform",
          animate && (useLongerAnimation ? "animate-twist" : "animate-quicktwist"),
        )}
        onAnimationEnd={() => setAnimate(false)}
      >
        {children}
      </div>
    </div>
  );
}
