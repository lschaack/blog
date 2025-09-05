// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Redis } from 'ioredis';

declare module 'ioredis' {
  interface Redis {
    eqConnect(
      sessionKey: string,
      connectionKey: string,
      playerName: string,
      playerJson: string,
      playerToken: string
    ): Promise<string>;

    eqDisconnect(
      sessionKey: string,
      connectionKey: string,
      playerName: string,
      playerToken: string
    ): Promise<string>;

    eqAddTurn(
      sessionKey: string,
      connectionKey: string,
      turnData: string,
      playerName: string,
      playerToken: string
    ): Promise<string>;
  }
}
