export const CONNECTION_ERROR_CODES = {
  // Player token mismatch in lua script
  // This is essentially irrecoverable - cookies are defined, but token is wrong for the name
  // Show "join game"
  403001: 'Player forbidden',
  // Player cookies not found in connect route
  // Show "join game"
  403002: 'Missing player cookies',
  // Game is full
  // Show "new game"
  403003: 'Game is full',
  // Cannot add turn b/c at least two players are required
  403004: 'Not enough players',
  // Cannot add or update turn b/c author is not the current player
  403005: 'Not current player',
  // Cannot start AI turn b/c already started
  403006: 'AI turn already started',
  // Cannot fail AI turn b/c AI turn is not in progress
  403007: 'AI turn not started',
  // SessionKey not defined in redis
  // Show "new game"
  404001: 'Game not found',
  // Player not defined in redis
  // Show "join game"
  404002: 'Player not found',
  // Player trying to join w/o cookies, but a player with this name is already in the game
  // Show "try a different name"
  409001: 'Player already in game',
  // Player trying to join w/cookies, matched name
  // Show "reconnect as {existing player name}"
  409002: 'Already joined',
  // Player trying to join w/cookies, mismatched name
  // Show "reconnect as {existing player name}" or "leave and join as {new player name}"
  409003: 'Wrong player',
  // Cannot connect player b/c they're already connected
  // Show "looks like you're already connected, check your other tabs!"
  409004: 'Player already connected',
  // Cannot disconnect player b/c they're not connected
  409005: 'Player not connected',
  // Who knows
  500001: 'Something went wrong',
  // Couldn't decode .eventLog from game state
  500002: 'Failed to process event logs for validation',
} as const;

export type ConnectionErrorCode = keyof typeof CONNECTION_ERROR_CODES;
export type ConnectionError = {
  code: ConnectionErrorCode,
  message: string,
}

export const DEFAULT_CONNECTION_ERROR: ConnectionError = {
  code: 500001,
  message: 'Something went wrong enough that I can\'t actually tell you what it is',
}

// Returns a ConnectionError from any response
export const extractConnectionError = async (response: Response): Promise<ConnectionError> => {
  if (response.ok) {
    console.error('Cannot extract connection error from successful response');

    return DEFAULT_CONNECTION_ERROR;
  }

  const { error } = await response.json();

  if (error && CONNECTION_ERROR_CODES[(error as ConnectionError).code]) {
    return error;
  } else {
    return DEFAULT_CONNECTION_ERROR;
  }
}
