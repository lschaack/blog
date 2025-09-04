// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Redis } from 'ioredis';

declare module 'ioredis' {
  interface Redis {
    eqConnect(sessionKey: string, playerPath: string, playerJson: string): Promise<string>;
    eqDisconnect(sessionKey: string, playerName: string): Promise<string>;
    eqAddTurn(sessionKey: string, turnData: string): Promise<string>;
  }
}
