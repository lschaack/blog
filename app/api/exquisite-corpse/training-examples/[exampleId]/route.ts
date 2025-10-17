import { NextResponse } from "next/server";
import { compose } from "../../../middleware/compose";
import { withZodRequestValidation } from "../../../middleware/zod";
import { withAuth } from "../../../middleware/authorization";
import { TrainingExample, TrainingExampleSchema } from "../../schemas";
import { getTrainingExampleService } from "@/app/lib/trainingExampleService";
import { withCatchallErrorHandler } from "@/app/api/middleware/catchall";

export const GET = compose(
  withCatchallErrorHandler,
  withAuth,
)(
  async (
    _,
    ctx: {
      params: Promise<{ exampleId: string }>
    },
  ) => {
    const { exampleId } = await ctx.params;

    const result = await getTrainingExampleService().getExample(exampleId);

    if (!result) {
      return NextResponse.json({ error: "Training example not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  }
)

export const PUT = compose(
  withCatchallErrorHandler,
  withZodRequestValidation(TrainingExampleSchema),
  withAuth,
)(
  async (
    _,
    ctx: {
      params: Promise<{ exampleId: string }>;
      validatedBody: Promise<TrainingExample>;
    }
  ) => {
    const { exampleId } = await ctx.params;

    const data = await ctx.validatedBody;

    try {
      const result = await getTrainingExampleService().updateExample(exampleId, data);

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Record to update not found")) {
        return NextResponse.json({ error: "Training example not found" }, { status: 404 });
      }
      throw error;
    }
  }
)

export const DELETE = compose(
  withCatchallErrorHandler,
  withAuth,
)(
  async (
    _,
    ctx: { params: Promise<{ exampleId: string }> }
  ) => {
    const { exampleId } = await ctx.params;

    try {
      await getTrainingExampleService().deleteExample(exampleId);

      return NextResponse.json({ success: true }, { status: 204 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
        return NextResponse.json({ error: "Training example not found" }, { status: 404 });
      }
      throw error;
    }
  }
)
