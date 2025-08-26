"use client";

//import { ImageGame } from "@/app/ExquisiteCorpse/ImageGame";
//import { CurveGame } from "@/app/ExquisiteCorpse/CurveGame";
import { ExquisiteCorpseGame } from "@/app/ExquisiteCorpse/ExquisiteCorpseGame";
//import { MultiplayerGame } from "@/app/ExquisiteCorpse/MultiplayerGame";
import { useMemo } from "react";

export default function Demo() {
  const dimensions = useMemo(() => ({
    width: 512,
    height: 512,
  }), []);

  return (
    //<MultiplayerGame dimensions={dimensions} />
    //<CurveGame dimensions={dimensions} />
    <ExquisiteCorpseGame />
  );
}
