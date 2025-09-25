import { CurveTurn, TurnMetaRenderer } from "../types/exquisiteCorpse";
import { ensureStartsWith } from "../utils/string";

export const CurveTurnMetaRenderer: TurnMetaRenderer<CurveTurn> = ({ turn, dimensions }) => {
  return (
    <div className="card space-y-2" style={{ maxWidth: dimensions.width }}>
      {turn.title && (
        <h2 className="font-semibold font-geist-mono text-xl [font-variant:all-small-caps]">{turn.title}</h2>
      )}
      {turn.interpretation && (
        <div className="text-gray-600 font-geist-mono">
          &ldquo;{turn.interpretation}&rdquo;
        </div>
      )}
      {turn.reasoning && (
        <div className="text-gray-500 font-geist-mono text-sm italic">
          &ldquo;{turn.reasoning}&rdquo;
        </div>
      )}
      {turn.thoughts && (
        <div className="text-gray-500 font-geist-mono text-sm italic">
          &ldquo;{turn.thoughts}&rdquo;
        </div>
      )}
      {turn.image && (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img src={ensureStartsWith(turn.image, 'data:image/png;base64,')} />
      )}
    </div>
  );
}
