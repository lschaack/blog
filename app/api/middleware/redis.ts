import { CUSTOM_REPLY_ERROR_TYPE } from "@/app/types/exquisiteCorpse";
import { Middleware } from "@/app/types/middleware";
import { ReplyError } from "ioredis";
import { NextResponse } from "next/server";

export class RedisPipelineError extends AggregateError {
  constructor(errors: Error[]) {
    super(errors, 'Redis pipeline failed');

    this.name = 'RedisPipelineError';

    Error.captureStackTrace(this, RedisPipelineError);
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

export const REPLY_ERROR_SPLITTER = /^(?<type>\S+)\s+(?<message>.*)$/;
export const withRedisErrorHandler: Middleware = handler => {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      if (error instanceof ReplyError) {
        console.error(error);

        const { type, message } = REPLY_ERROR_SPLITTER.exec((error as Error).message)?.groups ?? {};

        switch (type as CUSTOM_REPLY_ERROR_TYPE) {
          case 'FORBIDDEN': return NextResponse.json(
            { error: message },
            { status: 403 }
          );
          case 'NOT_FOUND': return NextResponse.json(
            { error: message },
            { status: 404 }
          );
          case 'CONFLICT': return NextResponse.json(
            { error: message },
            { status: 409 }
          );
          default: return NextResponse.json(
            { error: 'An unknown error occurred' },
            { status: 500 }
          );
        }
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
