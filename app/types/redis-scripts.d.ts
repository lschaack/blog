// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Redis } from 'ioredis';

declare module 'ioredis' {
  interface Redis {
    eqJoin(
      sessionKey: string,
      playersKey: string,
      playerName: string,
      playerJson: string,
      playerToken: string,
    ): Promise<string>;

    eqLeave(
      sessionKey: string,
      playersKey: string,
      playerName: string,
      playerToken: string,
    ): Promise<string>;

    eqConnect(
      sessionKey: string,
      playersKey: string,
      connectionsKey: string,
      connectionToken: string,
      playerName: string,
      playerToken: string,
    ): Promise<string>;

    eqDisconnect(
      sessionKey: string,
      connectionsKey: string,
      connectionToken: string,
      playerName: string,
    ): Promise<string>;

    eqAddTurn(
      sessionKey: string,
      playersKey: string,
      turnData: string,
      playerName: string,
      playerToken: string,
    ): Promise<string>;
  }
}
