import { Toast } from "radix-ui";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import clsx from 'clsx';
import { motion, AnimatePresence } from "motion/react";

export type MessageToastProps = {
  type: 'success' | 'error' | 'info';
  children: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toastStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-600',
    icon: CheckCircle2,
    iconColor: 'text-green-600'
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-600',
    icon: XCircle,
    iconColor: 'text-rose-600'
  },
  info: {
    bg: 'bg-amber-50',
    border: 'border-amber-600',
    icon: Info,
    iconColor: 'text-amber-600'
  }
};

export function MessageToast({ type, children, open, onOpenChange }: MessageToastProps) {
  const style = toastStyles[type];
  const Icon = style.icon;

  return (
    <Toast.Provider>
      <AnimatePresence>
        {open && (
          <Toast.Root
            open={open}
            onOpenChange={onOpenChange}
            asChild
          >
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 1000,
                damping: 55,
                mass: 2,
              }}
              className={clsx(
                style.bg,
                style.border,
                'border-2 rounded-lg p-4',
                'flex items-center justify-between',
                'max-w-md',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={`${style.iconColor} flex-shrink-0 w-5 h-5 mt-0.5`} />
                <Toast.Description>
                  {children}
                </Toast.Description>
              </div>
              <Toast.Close>
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Toast.Close>
            </motion.div>
          </Toast.Root>
        )}
      </AnimatePresence>
      <Toast.Viewport className="fixed bottom-0 right-0 p-6 flex flex-col gap-2 w-full max-w-md z-50" />
    </Toast.Provider>
  );
}
