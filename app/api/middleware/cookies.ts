import { cookies } from "next/headers";

import { Middleware } from "@/app/types/middleware";
import { NextResponse } from "next/server";

export const getMissingCookieResponse = (cookieName: string) => {
  return NextResponse.json(
    { error: `Missing cookie "${cookieName}"` },
    { status: 400 }
  )
}

export const withRequiredCookies = <TCookieNames extends readonly string[]>(
  ...cookieNames: TCookieNames
): Middleware<{ cookies: Record<TCookieNames[number], string> }> => {
  return (handler) => async (request, ctx) => {
    const cookieStore = await cookies();
    const cookieValues: Record<string, string> = {};

    for (const cookieName of cookieNames) {
      const cookieValue = cookieStore.get(cookieName)?.value;

      if (!cookieValue) {
        return getMissingCookieResponse(cookieName);
      }

      cookieValues[cookieName] = cookieValue;
    }

    return handler(request, {
      ...ctx,
      cookies: cookieValues as Record<TCookieNames[number], string>
    });
  };
};
