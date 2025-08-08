import { lazy } from "react";

import type { Demo as DemoType } from "@/app/graphql/graphql";
import { RichTextError } from "@/app/components/RichTextError";

export const DEMOS = {
  'dock-magnification': lazy(() => import('./dock-magnification/full')),
  'dock-magnification-no-shift': lazy(() => import('./dock-magnification/no-shift')),
  'dock-magnification-accurate-shift': lazy(() => import('./dock-magnification/accurate-shift')),
  'dock-magnification-elegant-shift': lazy(() => import('./dock-magnification/elegant-shift')),
  'dock-magnification-size-diff-wrong': lazy(() => import('./dock-magnification/size-diff-wrong')),
  'bubble-basic': lazy(() => import('./bubble/basic')),
  'bubble-with-hole': lazy(() => import('./bubble/with-hole')),
  'bubble-with-lerp': lazy(() => import('./bubble/with-lerp')),
  'bubble-complete': lazy(() => import('./bubble/complete')),
  'bubble-configurator': lazy(() => import('./bubble/configurator')),
  'bubble-matryoshka': lazy(() => import('./bubble/matryoshka')),
  'bubble-field': lazy(() => import('./bubble/field')),
  'bubble-tile': lazy(() => import('./bubble/tile')),
  'circle-packing': lazy(() => import('./circle-packing/visualizer')),
  'exquisite-corpse': lazy(() => import('./exquisite-corpse/game')),
  'exquisite-corpse-training': lazy(() => import('./exquisite-corpse/training-interface')),
  'test': lazy(() => import('./test')),
}

export const Demo = ({ entry }: { entry: DemoType }) => {
  const Demo = DEMOS[entry.key as keyof typeof DEMOS];

  if (!Demo) {
    return <RichTextError>Unknown demo: {entry.key}</RichTextError>;
  } else {
    return <Demo {...entry.args} />;
  }
}
