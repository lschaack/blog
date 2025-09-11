// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Redis } from 'ioredis';

declare module 'ioredis' {
  interface Redis {
    eqJoin(
      sessionKey: string,
      playersKey: string,
      playerOrderKey: string,
      connectionsKey: string,
      playerName: string,
      playerJson: string,
      playerToken: string,
    ): Promise<string>;

    eqLeave(
      sessionKey: string,
      playersKey: string,
      playerOrderKey: string,
      playerName: string,
      playerToken: string,
    ): Promise<string>;

    eqConnect(
      sessionKey: string,
      playersKey: string,
      playerOrderKey: string,
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
      playerOrderKey: string,
      connectionsKey: string,
      turnData: string,
      playerName: string,
      playerToken: string,
    ): Promise<string>;

    eqStartAiTurn(
      sessionKey: string,
    ): Promise<string>;

    eqFailAiTurn(
      sessionKey: string,
    ): Promise<string>;
  }
}
