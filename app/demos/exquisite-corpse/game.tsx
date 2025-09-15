"use client";

import { ImageGame } from "@/app/exquisite-corpse/ImageGame";
//import { CurveGame } from "@/app/exquisite-corpse/CurveGame";

export default function Demo() {
  return (
    <ImageGame dimensions={{ width: 512, height: 512 }} />
    //<CurveGame dimensions={{ width: 512, height: 512 }} />
  );
}
