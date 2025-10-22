"use client";

import { FC, memo, useContext } from "react";
import { Settings, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from 'clsx';

import { DebugContext } from "@/app/components/DebugContext";
import { Pingable } from "@/app/components/Pingable";

type DebugToggleProps = {
  className?: string;
}
export const DebugToggle: FC<DebugToggleProps> = memo(function DebugToggle({ className }) {
  const { debug, setDebug, isOverridden } = useContext(DebugContext);

  return (
    <Pingable ping={isOverridden} className="rounded-full inset-1 sm:inset-0">
      <button
        onClick={() => setDebug(prev => !prev)}
        className={clsx("icon-surface relative bg-white", className)}
      >
        <AnimatePresence mode="popLayout">
          {debug ? (
            <motion.div
              key="Minus"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
                transition: {
                  duration: 0.05,
                  delay: 0.1
                }
              }}
              exit={{
                opacity: 0,
                transition: {
                  duration: 0.02,
                }
              }}
              transition={{
                ease: "easeInOut"
              }}
            >
              <Minus size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="Settings"
              initial={{
                rotateX: '90deg',
                scaleX: 0.8,
              }}
              animate={{
                rotateX: 0,
                scaleX: 1,
              }}
              exit={{
                rotateX: '90deg',
                scaleX: 0.8,
              }}
              transition={{
                duration: 0.15,
                ease: "easeInOut"
              }}
            >
              <Settings size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </Pingable>
  );
});
