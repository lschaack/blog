import { Middleware } from "@/app/types/middleware";
import { NextResponse } from "next/server";

export class RedisPipelineError extends AggregateError {
  constructor(errors: Error[]) {
    super(errors, 'Redis pipeline failed');

    Error.captureStackTrace(this, RedisPipelineError);
  }
}

export class RedisError extends Error {
  constructor(message: string | Error) {
    super(message instanceof Error ? message.message : message);

    this.name = 'RedisError';

    Error.captureStackTrace(this, RedisError);
  }
}

type PipelineResult = [error: Error | null, result: unknown][] | null;
type PipelineTransform<T> = (result: NonNullable<PipelineResult>) => T;
export function validatePipelineResult<T = NonNullable<PipelineResult>>(
  result: PipelineResult,
  transform: PipelineTransform<T> = (id => id as T),
) {
  if (!result) {
    throw new RedisPipelineError([new Error('No result received from pipeline')]);
  }

  const errors: Error[] = [];
  for (let i = 0; i < result.length; i++) {
    const [error] = result[i];

    if (error) errors.push(error);
  }

  if (errors.length) {
    throw new RedisPipelineError(errors);
  }

  return transform(result);
}

export const withRedisErrorHandler: Middleware = handler => {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      if (error instanceof RedisError) {
        console.error(JSON.stringify(error, null, 2));
        console.error(error.stack);

        return NextResponse.json(
          { errors: error.message },
          { status: 400 }
        );
      } else if (error instanceof RedisPipelineError) {
        console.group(error.message);

        for (let i = 0; i < error.errors.length; i++) {
          const err = error.errors[i];
          console.group(`error ${i}`);
          console.error(JSON.stringify(err, null, 2));
          console.groupEnd();
        }

        console.error(error.stack);

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
