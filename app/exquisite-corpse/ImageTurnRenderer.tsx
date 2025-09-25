import { useMemo } from "react";
import { ImageGeminiFlashPreviewTurn, TurnMetaRenderer, TurnRenderer } from "@/app/types/exquisiteCorpse";
import { ensureStartsWith } from "@/app/utils/string";

export const ImageTurnRenderer: TurnRenderer<ImageGeminiFlashPreviewTurn> = ({
  turns,
  dimensions,
}) => {
  // For image turns, we need to show the latest image as background
  // and allow the user to draw on top of it
  const backgroundImage = useMemo(() => {
    return turns.findLast(turn => !!turn.image)?.image ?? null;
  }, [turns]);

  return (
    backgroundImage && (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={ensureStartsWith(backgroundImage, 'data:image/png;base64,')}
        alt="Background"
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 object-contain"
      />
    )
  );
};

export const ImageTurnMetaRenderer: TurnMetaRenderer<ImageGeminiFlashPreviewTurn> = ({
  turn,
  dimensions,
}) => {
  return (
    <div className="card space-y-2" style={{ maxWidth: dimensions.width }}>
      {turn.interpretation && (
        <div className="text-gray-500 font-geist-mono text-sm">
          &ldquo;{turn.interpretation}&rdquo;
        </div>
      )}
    </div>
  )
}
