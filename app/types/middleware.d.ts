import type { NextRequest, NextResponse } from "next/server";

type BaseRouteContext<TParams extends object> = {
  params: Promise<TParams>;
};

export type APIRouteHandler<TContext extends BaseRouteContext> = (
  request: NextRequest,
  ctx: TContext,
) => Promise<NextResponse>;

export type Middleware<
  TExtension extends object = object,
  TContext extends BaseRouteContext = BaseRouteContext,
> = <C extends TContext>(
  handler: (
    request: NextRequest,
    ctx: TContext & TExtension
  ) => Promise<R>
) => APIRouteHandler<C>;
