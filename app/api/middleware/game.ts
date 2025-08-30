import { Middleware } from "@/app/types/middleware";
import { NextResponse } from "next/server";
import { GameError } from "../exquisite-corpse/gameError";

export const withGameErrorHandler: Middleware = (handler) => {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      if (error instanceof GameError) {
        if (error.type === 'GAME_NOT_FOUND') {
          return NextResponse.json(
            { error: error.message },
            { status: 404 }
          );
        } else if (error.type === 'AI_TURN_IN_PROGRESS') {
          return NextResponse.json(
            { error: error.message },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { error: 'Unknown game error. Typescript failed me.' },
            { status: 500 }
          );
        }
      }

      throw error;
    }
  }
}
