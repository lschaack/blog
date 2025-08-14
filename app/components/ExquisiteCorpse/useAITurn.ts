import { useState, useCallback } from "react";
import { BaseTurn } from "@/app/types/exquisiteCorpse";

export type AITurnState = "idle" | "processing" | "error" | "complete";

export type AITurnError = {
  message: string;
  type: "network" | "validation" | "ai_response" | "image_generation" | "unknown";
  retryable: boolean;
};

export type AITurnData<Turn extends BaseTurn> = Omit<Turn, keyof BaseTurn>;

export const useAITurn = <Turn extends BaseTurn>(
  aiFunction?: (history: Turn[]) => Promise<AITurnData<Turn>>
) => {
  const [state, setState] = useState<AITurnState>("idle");
  const [error, setError] = useState<AITurnError | null>(null);
  const [progress, setProgress] = useState<string>("");

  const processAITurn = useCallback(async (
    turns: Turn[] // Game history for context
  ): Promise<AITurnData<Turn>> => {
    if (!aiFunction) {
      throw new Error("No AI function provided");
    }

    setState("processing");
    setError(null);
    setProgress("AI is thinking...");

    try {
      const result = await aiFunction(turns);

      setState("complete");
      setProgress("");

      return result;

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
  }, [aiFunction]);

  const retryAITurn = useCallback(async (
    turns: Turn[]
  ) => {
    if (state !== "error" || !error?.retryable) {
      throw new Error("Cannot retry - no retryable error state");
    }

    return processAITurn(turns);
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

  return {
    // State
    state,
    error,
    progress,

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
