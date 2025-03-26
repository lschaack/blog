import { lazy } from "react";

import type { Demo as DemoType } from "@/app/graphql/graphql";

export const DEMOS = {
  'dock-magnification': lazy(() => import('./dock-magnification/full')),
  'dock-magnification-no-shift': lazy(() => import('./dock-magnification/no-shift')),
  'dock-magnification-accurate-shift': lazy(() => import('./dock-magnification/accurate-shift')),
}

export const Demo = ({ entry }: { entry: DemoType }) => {
  const Demo = DEMOS[entry.id as keyof typeof DEMOS];

  if (!Demo) {
    return <p>Unknown demo: {entry.id}</p>;
  } else {
    return <Demo />;
  }
}
