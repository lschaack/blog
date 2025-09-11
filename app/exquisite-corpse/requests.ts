import { BaseTurn, CurveTurn } from "../types/exquisiteCorpse";

export const leaveGame = async (sessionId: string) => {
  if (sessionId) {
    try {
      await fetch(`/api/exquisite-corpse/games/${sessionId}/leave`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to notify backend of player leaving:', error);
    }
  }
};

export const submitTurn = async (sessionId: string, turnData: Omit<CurveTurn, keyof BaseTurn>) => {
  if (sessionId) {
    try {
      const response = await fetch(`/api/exquisite-corpse/games/${sessionId}/turns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(turnData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit turn');
      }

    } catch (error) {
      console.error('Failed to submit turn:', error);
      throw error;
    }
  }
};

export const retryAI = async (sessionId: string) => {
  if (sessionId) {
    try {
      const response = await fetch(`/api/exquisite-corpse/games/${sessionId}/retry-ai`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retry AI turn');
      }

    } catch (error) {
      console.error('Failed to retry AI turn:', error);
      throw error;
    }
  }
};
