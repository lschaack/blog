import { Middleware } from "@/app/types/middleware";
import { NextResponse } from "next/server";

export const withCatchallErrorHandler: Middleware = (handler) => {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      console.log('CAUGHT by withCatchallErrorHandler')
      console.error('Unknown error. Freaking out.');

      if (error instanceof Error) {
        console.error(error.message);
        console.error(error.stack);

        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      console.error('The error is not even an error. What have you done??');

      return NextResponse.json(
        { error },
        { status: 500 }
      )
    }
  }
}
