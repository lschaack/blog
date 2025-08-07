import { useState, useCallback } from "react";
import { Line } from "./Sketchpad";
import { Turn } from "./useTurnManager";
import { getGeminiService, GameContext } from "@/app/services/geminiAI";
import { renderGameStateToBase64, createGameContextSummary, checkImageSizeLimit } from "@/app/utils/imageContext";
import { processAIBezierCurves } from "@/app/utils/lineConversion";

export type AITurnState = "idle" | "processing" | "error" | "complete";

export type AITurnError = {
  message: string;
  type: "network" | "validation" | "ai_response" | "image_generation" | "unknown";
  retryable: boolean;
};

export const useAITurn = () => {
  const [state, setState] = useState<AITurnState>("idle");
  const [error, setError] = useState<AITurnError | null>(null);
  const [progress, setProgress] = useState<string>("");

  const processAITurn = useCallback(async (
    allLines: Line[], // All lines currently in the game
    turns: Turn[], // Game history for context
    canvasDimensions: { width: number; height: number }
  ): Promise<{ line: Line; interpretation: string; reasoning: string }> => {
    setState("processing");
    setError(null);
    setProgress("Preparing game context...");

    try {
      // Step 1: Render current game state to image
      setProgress("Rendering current drawing...");
      const base64Image = await renderGameStateToBase64(
        allLines, 
        canvasDimensions.width, 
        canvasDimensions.height
      );

      // Step 2: Validate image size
      if (!checkImageSizeLimit(base64Image)) {
        throw new Error("Generated image is too large for AI processing");
      }

      // Step 3: Create game context
      setProgress("Building game history...");
      const gameContext: GameContext = {
        image: base64Image,
        canvasDimensions,
        currentTurn: turns.length + 1,
        history: createGameContextSummary(turns)
      };

      // Step 4: Call AI service
      setProgress("Waiting for AI response...");
      const geminiService = getGeminiService();
      const aiResponse = await geminiService.generateTurn(gameContext);

      // Step 5: Convert AI Bezier curves to our line format
      setProgress("Processing AI drawing...");
      const convertedLine = processAIBezierCurves(aiResponse.curves);

      setState("complete");
      setProgress("");

      return {
        line: convertedLine,
        interpretation: aiResponse.interpretation,
        reasoning: aiResponse.reasoning
      };

    } catch (err) {
      console.error("AI turn processing failed:", err);
      
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      let errorType: AITurnError["type"] = "unknown";
      let retryable = true;

      // Categorize errors for better UX
      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        errorType = "network";
      } else if (errorMessage.includes("API key") || errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
        errorType = "ai_response";
      } else if (errorMessage.includes("validation") || errorMessage.includes("points") || errorMessage.includes("coordinate")) {
        errorType = "validation";
      } else if (errorMessage.includes("image") || errorMessage.includes("render")) {
        errorType = "image_generation";
      }

      // Some errors are not retryable
      if (errorMessage.includes("API key") || errorMessage.includes("quota exceeded")) {
        retryable = false;
      }

      const aiError: AITurnError = {
        message: errorMessage,
        type: errorType,
        retryable
      };

      setState("error");
      setError(aiError);
      setProgress("");
      
      throw aiError;
    }
  }, []);

  const retryAITurn = useCallback(async (
    allLines: Line[],
    turns: Turn[],
    canvasDimensions: { width: number; height: number }
  ) => {
    if (state !== "error" || !error?.retryable) {
      throw new Error("Cannot retry - no retryable error state");
    }
    
    return processAITurn(allLines, turns, canvasDimensions);
  }, [state, error, processAITurn]);

  const resetAITurn = useCallback(() => {
    setState("idle");
    setError(null);
    setProgress("");
  }, []);

  const getErrorMessage = useCallback((error: AITurnError): string => {
    switch (error.type) {
      case "network":
        return "Network connection failed. Please check your internet connection and try again.";
      case "ai_response":
        return "AI service is temporarily unavailable. This might be due to rate limits or service issues.";
      case "validation":
        return "AI provided invalid drawing data. This is usually temporary - please try again.";
      case "image_generation":
        return "Failed to prepare the drawing for AI analysis. Please try again.";
      default:
        return `AI turn failed: ${error.message}`;
    }
  }, []);

  const getProgressDescription = useCallback((progress: string): string => {
    if (!progress) return "";
    
    const progressMap: Record<string, string> = {
      "Preparing game context...": "Setting up the game state...",
      "Rendering current drawing...": "Creating image of current drawing...",
      "Building game history...": "Summarizing previous turns...",
      "Waiting for AI response...": "AI is analyzing and creating curves...",
      "Processing AI drawing...": "Optimizing AI's artistic curves..."
    };
    
    return progressMap[progress] || progress;
  }, []);

  return {
    // State
    state,
    error,
    progress: getProgressDescription(progress),
    
    // Actions
    processAITurn,
    retryAITurn,
    resetAITurn,
    
    // Utilities
    getErrorMessage,
    
    // Status queries
    isProcessing: state === "processing",
    hasError: state === "error",
    isComplete: state === "complete",
    canRetry: state === "error" && error?.retryable === true,
  };
};