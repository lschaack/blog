import { NextResponse } from "next/server";
import { compose } from "../../middleware/compose";
import { auth } from "@/app/auth";
import { withZodRequestValidation } from "../../middleware/zod";
import { PaginationRequest, PaginationRequestSchema } from "../schemas";

export const GET = compose(
  withZodRequestValidation(PaginationRequestSchema),
  //auth,
)(
  async (
    _,
    ctx: {
      validatedBody: Promise<PaginationRequest>
    }
  ) => {
    return NextResponse.json(null);
  }
)
