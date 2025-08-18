"use client";

//import { CurveGame } from "@/app/components/ExquisiteCorpse/CurveGame";
import { MultiplayerGame } from "@/app/components/ExquisiteCorpse/MultiplayerGame";
//import { ImageGame } from "@/app/components/ExquisiteCorpse/ImageGame";
import { useMemo } from "react";

export default function Demo() {
  const dimensions = useMemo(() => ({
    width: 512,
    height: 512,
  }), []);

  return (
    <MultiplayerGame dimensions={dimensions} />
  );
}
