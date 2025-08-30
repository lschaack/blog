import { cookies } from "next/headers";

import { Middleware } from "@/app/types/middleware";
import { NextResponse } from "next/server";

export const withRequiredCookies = <TCookieNames extends readonly string[]>(
  ...cookieNames: TCookieNames
): Middleware<{ cookies: Record<TCookieNames[number], string> }> => {
  return (handler) => async (request, ctx) => {
    const cookieStore = await cookies();
    const cookieValues: Record<string, string> = {};

    for (const cookieName of cookieNames) {
      const cookieValue = cookieStore.get(cookieName)?.value;

      if (!cookieValue) {
        return NextResponse.json(
          { error: 'Missing player ID cookie' },
          { status: 400 }
        );
      }

      cookieValues[cookieName] = cookieValue;
    }

    return handler(request, {
      ...ctx,
      cookies: cookieValues as Record<TCookieNames[number], string>
    });
  };
};
