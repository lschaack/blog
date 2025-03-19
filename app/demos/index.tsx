import { lazy } from "react";

export const DEMOS = {
  'dock-magnification': lazy(() => import('./dock-magnification/full')),
  'dock-magnification-no-shift': lazy(() => import('./dock-magnification/no-shift')),
}
