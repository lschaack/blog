import { Middleware } from '@/app/types/middleware';
import { NextResponse } from 'next/server';
import z, { ZodType } from 'zod';

export const withZodRequestValidation = <Schema extends ZodType>(
  schema: Schema
): Middleware<{ validatedBody: Promise<z.infer<Schema>> }> => {
  return handler => async (request, ctx) => {
    try {
      const validatedBody = await request.json().then(schema.parse);

      // no need to await handler since I'm only validating the schema passed to this middleware
      return handler(request, {
        ...ctx,
        validatedBody,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.group(`Failed to parse zod schema with ${error.errors.length} errors`);

        let message = '';
        for (let i = 0; i < error.errors.length; i++) {
          const err = error.errors[i];
          if (i > 0) message += '\n';
          message += err.message;

          console.group(`Zod error ${i}`);
          console.error(err);
          console.groupEnd();
        }

        console.groupEnd();

        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      } else {
        throw error;
      }
    }
  }
}
