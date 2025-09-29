import { CurveTurn, TurnRenderer } from "@/app/types/exquisiteCorpse";
import { SelfDrawingSketch } from "./SelfDrawingPath";

export const CurveTurnRenderer: TurnRenderer<CurveTurn> = ({ turns, dimensions }) => {
  return (
    <SelfDrawingSketch
      paths={turns.map(({ path }) => path)}
      dimensions={dimensions}
      className="absolute inset-0 fill-none pointer-events-none"
    />
  );
}
