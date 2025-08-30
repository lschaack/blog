import { Middleware } from '@/app/types/middleware';
import { NextResponse } from 'next/server';
import z, { ZodType } from 'zod';

export const withZodRequestValidation = <Schema extends ZodType>(
  schema: Schema
): Middleware<{ validatedBody: Promise<z.infer<Schema>> }> => {
  return handler => async (request, ctx) => {
    try {
      // kind of confusing control flow here, but here's what I expect to happen:
      // - validatedBody gets return as part of ctx
      // - when it's awaited by the handler which this wraps, it could throw an error
      // - b/c this function wraps that handler, it will bubble up to the following catch block
      // - that way, no .catch is needed on the validatedBody promise and a failure still
      //   results in the relevant NextResponse being sent
      const validatedBody = request.json().then(schema.parse);

      return handler(request, {
        ...ctx,
        validatedBody,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.group(`Failed to parse zod schema with ${error.errors.length} errors`);

        for (let i = 0; i < error.errors.length; i++) {
          console.group(`Zod error ${i}`);
          console.error(error.errors[i]);
          console.groupEnd();
        }

        console.groupEnd();

        return NextResponse.json(
          { errors: error.errors.map(({ message }) => message) },
          { status: 400 }
        );
      } else {
        throw error;
      }
    }
  }
}
