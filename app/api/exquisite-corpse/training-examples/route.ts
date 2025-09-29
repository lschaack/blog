import { NextResponse } from "next/server";
import { compose } from "../../middleware/compose";
import { withZodRequestValidation } from "../../middleware/zod";
import { withAuth } from "../../middleware/authorization";
import { PaginationRequest, PaginationRequestSchema } from "../schemas";
import { getGameService } from "@/app/lib/gameService";
import { toLimitOffset } from "@/app/utils/pagination";

export const GET = compose(
  withZodRequestValidation(PaginationRequestSchema),
  withAuth,
)(
  async (
    _,
    ctx: {
      validatedBody: Promise<PaginationRequest>
    }
  ) => {
    const requestedPage = await ctx.validatedBody;

    const { limit, offset } = toLimitOffset(requestedPage);

    const result = await getGameService().getGames(limit, offset);

    return NextResponse.json(result);
  }
)
