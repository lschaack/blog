import { NextResponse } from "next/server";
import { compose } from "../middleware/compose";
import { withAuth } from "../middleware/authorization";
import { withCatchallErrorHandler } from "../middleware/catchall";
import { withZodRequestValidation } from "../middleware/zod";
import { getTagService } from "@/app/lib/tagService";
import { CreateTagRequest, CreateTagSchema } from "../exquisite-corpse/schemas";
import { Session } from "next-auth";

export const GET = compose(
  withAuth,
  withCatchallErrorHandler,
)(
  async (_, ctx) => {
    const tagService = getTagService();
    const tags = await tagService.getTags(ctx.session);

    return NextResponse.json(
      { tags },
      { status: 200 }
    );
  }
);

export const POST = compose(
  withAuth,
  withCatchallErrorHandler,
  withZodRequestValidation(CreateTagSchema),
)(
  async (
    _,
    ctx: {
      validatedBody: Promise<CreateTagRequest>;
      session: Session;
    }
  ) => {
    const { name } = await ctx.validatedBody;
    const tagService = getTagService();

    try {
      const tag = await tagService.createTag(name, ctx.session);

      return NextResponse.json(tag, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === "Tag name already exists") {
        return NextResponse.json(
          { error: "Tag name already exists" },
          { status: 409 }
        );
      }

      throw error;
    }
  }
);
