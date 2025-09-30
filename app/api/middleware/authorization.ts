import { auth } from "@/app/auth";
import { Middleware } from "@/app/types/middleware";
import { NextResponse } from "next/server";

export const withAuth: Middleware = handler => {
  return async (request, ctx) => {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(request, ctx);
  }
}
