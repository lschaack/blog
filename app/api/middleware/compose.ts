/* FIXME: sure would be nice

import { APIRouteHandler, BaseRouteContext, Middleware } from '@/app/types/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Compose overloads for middleware
export function compose<
  TContext extends BaseRouteContext<object>
>(
  m1: Middleware<object, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object
>(
  m2: Middleware<object, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object,
  E2 extends object
>(
  m3: Middleware<object, TContext & E1 & E2>,
  m2: Middleware<E2, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object,
  E2 extends object,
  E3 extends object
>(
  m4: Middleware<object, TContext & E1 & E2 & E3>,
  m3: Middleware<E3, TContext & E1 & E2>,
  m2: Middleware<E2, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object,
  E2 extends object,
  E3 extends object,
  E4 extends object
>(
  m5: Middleware<object, TContext & E1 & E2 & E3 & E4>,
  m4: Middleware<E4, TContext & E1 & E2 & E3>,
  m3: Middleware<E3, TContext & E1 & E2>,
  m2: Middleware<E2, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object,
  E2 extends object,
  E3 extends object,
  E4 extends object,
  E5 extends object
>(
  m6: Middleware<object, TContext & E1 & E2 & E3 & E4 & E5>,
  m5: Middleware<E5, TContext & E1 & E2 & E3 & E4>,
  m4: Middleware<E4, TContext & E1 & E2 & E3>,
  m3: Middleware<E3, TContext & E1 & E2>,
  m2: Middleware<E2, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object,
  E2 extends object,
  E3 extends object,
  E4 extends object,
  E5 extends object,
  E6 extends object
>(
  m7: Middleware<object, TContext & E1 & E2 & E3 & E4 & E5 & E6>,
  m6: Middleware<E6, TContext & E1 & E2 & E3 & E4 & E5>,
  m5: Middleware<E5, TContext & E1 & E2 & E3 & E4>,
  m4: Middleware<E4, TContext & E1 & E2 & E3>,
  m3: Middleware<E3, TContext & E1 & E2>,
  m2: Middleware<E2, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object,
  E2 extends object,
  E3 extends object,
  E4 extends object,
  E5 extends object,
  E6 extends object,
  E7 extends object
>(
  m8: Middleware<object, TContext & E1 & E2 & E3 & E4 & E5 & E6 & E7>,
  m7: Middleware<E7, TContext & E1 & E2 & E3 & E4 & E5 & E6>,
  m6: Middleware<E6, TContext & E1 & E2 & E3 & E4 & E5>,
  m5: Middleware<E5, TContext & E1 & E2 & E3 & E4>,
  m4: Middleware<E4, TContext & E1 & E2 & E3>,
  m3: Middleware<E3, TContext & E1 & E2>,
  m2: Middleware<E2, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose<
  TContext extends BaseRouteContext<object>,
  E1 extends object,
  E2 extends object,
  E3 extends object,
  E4 extends object,
  E5 extends object,
  E6 extends object,
  E7 extends object,
  E8 extends object
>(
  m9: Middleware<object, TContext & E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8>,
  m8: Middleware<E8, TContext & E1 & E2 & E3 & E4 & E5 & E6 & E7>,
  m7: Middleware<E7, TContext & E1 & E2 & E3 & E4 & E5 & E6>,
  m6: Middleware<E6, TContext & E1 & E2 & E3 & E4 & E5>,
  m5: Middleware<E5, TContext & E1 & E2 & E3 & E4>,
  m4: Middleware<E4, TContext & E1 & E2 & E3>,
  m3: Middleware<E3, TContext & E1 & E2>,
  m2: Middleware<E2, TContext & E1>,
  m1: Middleware<E1, TContext>
): Middleware<object, TContext>;

export function compose(...middlewares: Array<Middleware<any, any>>) {
  return function composedMiddleware<C extends BaseRouteContext<object>>(
    handler: (request: NextRequest, ctx: any) => Promise<NextResponse>
  ): APIRouteHandler<C> {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}
*/

export const compose = <T>(...fns: Array<(fn: T) => T>) => (fn: T): T => (
  fns.reduceRight((acc, f) => f(acc), fn)
)
