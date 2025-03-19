// Tailwind classes need to appear in full to not be stripped from the build,
// so afaict some form of this is necessary
export const inputColorClasses = {
  amber: {
    track: 'bg-amber-200',
    filled: 'bg-amber-500',
    thumb: 'bg-amber-800',
    thumbActive: 'bg-amber-950',
    focused: 'shadow-lg ring-4 ring-amber-200',
  },
  lime: {
    track: 'bg-lime-200',
    filled: 'bg-lime-500',
    thumb: 'bg-lime-800',
    thumbActive: 'bg-lime-950',
    focused: 'shadow-lg ring-4 ring-lime-200',
  },
  cyan: {
    track: 'bg-cyan-200',
    filled: 'bg-cyan-500',
    thumb: 'bg-cyan-800',
    thumbActive: 'bg-cyan-950',
    focused: 'shadow-lg ring-4 ring-cyan-200',
  },
  teal: {
    track: 'bg-teal-200',
    filled: 'bg-teal-500',
    thumb: 'bg-teal-800',
    thumbActive: 'bg-teal-950',
    focused: 'shadow-lg ring-4 ring-teal-200',
  },
  indigo: {
    track: 'bg-indigo-200',
    filled: 'bg-indigo-500',
    thumb: 'bg-indigo-800',
    thumbActive: 'bg-indigo-950',
    focused: 'shadow-lg ring-4 ring-indigo-200',
  },
  rose: {
    track: 'bg-rose-200',
    filled: 'bg-rose-500',
    thumb: 'bg-rose-800',
    thumbActive: 'bg-rose-950',
    focused: 'shadow-lg ring-4 ring-rose-200',
  }
} as const;
