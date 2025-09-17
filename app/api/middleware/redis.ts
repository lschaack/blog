import { ConnectionError, DEFAULT_CONNECTION_ERROR } from "@/app/lib/connectionError";
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

// Custom reply errors look like
// {code} {message}
// where code is a six-digit int like {status}{domainCode}
// where status is an http response code
// and domainCode is the code for the specific issue resulting in that status
// These are defined and documented in CONNECTION_ERROR_CODES
export const REPLY_ERROR_SPLITTER = /^ERR_(?<code>(?<status>\d{3})(?<domainCode>\d{3}))\s+(?<message>.*)$/;
export const withRedisErrorHandler: Middleware = handler => {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      if (error instanceof ReplyError) {
        console.error(error);

        const match = REPLY_ERROR_SPLITTER.exec((error as Error).message);

        if (match) {
          const { code: rawCode, status: rawStatus, message } = match.groups ?? {};

          const code = parseInt(rawCode);
          const status = parseInt(rawStatus);

          if (!isNaN(status) && !isNaN(code)) {
            return NextResponse.json(
              { error: { code, message } as ConnectionError },
              { status }
            );
          }
        }

        return NextResponse.json(
          { error: DEFAULT_CONNECTION_ERROR },
          { status: 500 }
        );
      } else if (error instanceof RedisPipelineError) {
        console.group(error.message);

        let message = '';
        for (let i = 0; i < error.errors.length; i++) {
          const err = error.errors[i];
          if (i > 0) message += '\n';
          message += err.message;

          console.group(`error ${i}`);
          console.error(JSON.stringify(err, null, 2));
          console.groupEnd();
        }

        console.error(error.stack);

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
