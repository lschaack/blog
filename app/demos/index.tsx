import { lazy } from "react";

import type { Demo as DemoType } from "@/app/graphql/graphql";
import { RichTextError } from "../components/RichTextError";

export const DEMOS = {
  'dock-magnification': lazy(() => import('./dock-magnification/full')),
  'dock-magnification-no-shift': lazy(() => import('./dock-magnification/no-shift')),
  'dock-magnification-accurate-shift': lazy(() => import('./dock-magnification/accurate-shift')),
  'dock-magnification-elegant-shift': lazy(() => import('./dock-magnification/elegant-shift')),
  'dock-magnification-size-diff-wrong': lazy(() => import('./dock-magnification/size-diff-wrong')),
  'test': lazy(() => import('./test')),
}

export const Demo = ({ entry }: { entry: DemoType }) => {
  const Demo = DEMOS[entry.id as keyof typeof DEMOS];

  if (!Demo) {
    return <RichTextError>Unknown demo: {entry.id}</RichTextError>;
  } else {
    return <Demo />;
  }
}
