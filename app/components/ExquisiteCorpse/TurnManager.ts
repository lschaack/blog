import { Line } from "./Sketchpad";

export type Turn = {
  line: Line;
  author: "user" | "ai";
  timestamp: string;
  number: number;
  // AI-specific fields
  interpretation?: string; // AI's interpretation of what the drawing represents
  reasoning?: string; // AI's reasoning for adding their line
  // Legacy field for backward compatibility
  guess?: string;
}

export class TurnManager {
  private _turns: Turn[] = [];
  private _currentTurnIndex: number = 0;
  private _onTurnEnd?: (turn: Turn) => void;
  private _syncStateCallback: (turns: Turn[], currentTurnIndex: number) => void;
  public isAIEnabled: boolean = true;

  constructor(
    onTurnEnd?: (turn: Turn) => void,
    syncStateCallback: (turns: Turn[], currentTurnIndex: number) => void = () => {}
  ) {
    this._onTurnEnd = onTurnEnd;
    this._syncStateCallback = syncStateCallback;
  }

  // Private method to sync state and trigger React updates
  private syncState(): void {
    this._syncStateCallback(this._turns, this._currentTurnIndex);
  }

  // Getters for current state
  get turns(): Turn[] {
    return [...this._turns]; // Return copy to prevent external mutation
  }

  get currentTurnIndex(): number {
    return this._currentTurnIndex;
  }

  // Navigation state getters
  get isViewingCurrentTurn(): boolean {
    return this._currentTurnIndex === this._turns.length;
  }

  get canGoToPrevious(): boolean {
    return this._currentTurnIndex > 0;
  }

  get canGoToNext(): boolean {
    return this._currentTurnIndex < this._turns.length;
  }

  // Turn metadata getters
  get currentTurnNumber(): number {
    return this._currentTurnIndex + 1;
  }

  get totalTurns(): number {
    return this._turns.length + 1;
  }

  get lastTurn(): Turn | undefined {
    return this._turns[this._turns.length - 1];
  }

  get isUserTurn(): boolean {
    if (!this.isAIEnabled) {
      return true; // Always user's turn when AI is disabled
    }
    return !this.lastTurn || this.lastTurn.author === "ai";
  }

  get isAITurn(): boolean {
    if (!this.isAIEnabled) {
      return false; // Never AI's turn when AI is disabled
    }
    return Boolean(this.lastTurn && this.lastTurn.author === "user");
  }

  // Display lines getter
  get displayLines(): Line[] {
    return this._turns.slice(0, this._currentTurnIndex).map(turn => turn.line);
  }

  // Turn navigation methods
  goToPreviousTurn = (): void => {
    if (this.canGoToPrevious) {
      this._currentTurnIndex--;
      this.syncState();
    }
  }

  goToNextTurn = (): void => {
    if (this.canGoToNext) {
      this._currentTurnIndex++;
      this.syncState();
    }
  }

  goToCurrentTurn = (): void => {
    this._currentTurnIndex = this._turns.length;
    this.syncState();
  }

  // Turn completion methods
  endUserTurn = (line: Line): Turn => {
    const newTurn: Turn = {
      line,
      author: "user",
      timestamp: new Date().toISOString(),
      number: this._turns.length + 1,
    };

    this._turns.push(newTurn);
    this._currentTurnIndex = this._turns.length;
    this._onTurnEnd?.(newTurn);
    this.syncState();

    return newTurn;
  }

  endAITurn = (line: Line, interpretation: string, reasoning: string): Turn => {
    const newTurn: Turn = {
      line,
      author: "ai",
      timestamp: new Date().toISOString(),
      number: this._turns.length + 1,
      interpretation,
      reasoning,
    };

    this._turns.push(newTurn);
    this._currentTurnIndex = this._turns.length;
    this._onTurnEnd?.(newTurn);
    this.syncState();

    return newTurn;
  }

  // Generic turn completion (for backward compatibility)
  endTurn = (line: Line): Turn => {
    return this.endUserTurn(line);
  }

  // Clear all turns
  clearAllTurns = (): void => {
    this._turns = [];
    this._currentTurnIndex = 0;
    this.syncState();
  }

  // Restore state from JSON
  restoreState = (newTurns: Turn[], newCurrentTurnIndex: number): void => {
    this._turns = [...newTurns]; // Copy to prevent external mutation
    this._currentTurnIndex = Math.min(newCurrentTurnIndex, newTurns.length);
    this.syncState();
  }
}