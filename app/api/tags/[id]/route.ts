import { NextResponse } from "next/server";
import { compose } from "../../middleware/compose";
import { withAuth } from "../../middleware/authorization";
import { withCatchallErrorHandler } from "../../middleware/catchall";
import { getTagService } from "@/app/lib/tagService";
import { Session } from "next-auth";

export const DELETE = compose(
  withAuth,
  withCatchallErrorHandler,
)(
  async (
    _,
    ctx: {
      params: Promise<{ id: string }>;
      session: Session;
    }
  ) => {
    const { id } = await ctx.params;
    const tagService = getTagService();

    try {
      await tagService.deleteTag(id, ctx.session);

      return NextResponse.json(
        { success: true },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Tag not found") {
        return NextResponse.json(
          { error: "Tag not found" },
          { status: 404 }
        );
      }
      throw error;
    }
  }
);
