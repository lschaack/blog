import { NextResponse } from "next/server";
import { compose } from "../../middleware/compose";
import { withZodRequestValidation } from "../../middleware/zod";
import { withAuth } from "../../middleware/authorization";
import { PaginationRequest, PaginationRequestSchema } from "../schemas";
import { prisma, Prisma } from "@/app/lib/prisma";

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
    const { page, perPage } = await ctx.validatedBody;

    const [pageData, totalCount] = await Promise.all([
      prisma.exquisiteCorpseGame.findMany({
        where: {
          data: {
            path: ['turns', '0'],
            not: Prisma.JsonNull,
          }
        },
        take: perPage,
        skip: (Math.max(page - 1, 0) * perPage),
        orderBy: {
          createdAt: 'desc',
        }
      }),
      prisma.exquisiteCorpseGame.count({
        where: {
          data: {
            path: ['turns', '0'],
            not: Prisma.JsonNull,
          }
        }
      }),
    ]);

    const total = Math.ceil(totalCount / perPage);

    return NextResponse.json({
      items: pageData,
      total
    });
  }
)
