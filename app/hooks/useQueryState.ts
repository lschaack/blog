"use client";

import { useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export const useQueryState = <T>(
  name: string,
  getDefaultValue: () => T,
  serialize: (value: T) => string = JSON.stringify,
  deserialize: (value: string) => T = JSON.parse,
): [T, typeof setValue] => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const setValue = useCallback((next?: T) => {
    const writeableParams = new URLSearchParams(searchParams.toString());
    writeableParams.set(name, serialize(next ?? getDefaultValue()));

    router.push(`${pathname}?${writeableParams}`)
  }, [getDefaultValue, name, pathname, router, searchParams, serialize]);

  const requestedValue = searchParams.get(name);

  const value = requestedValue
    ? deserialize(requestedValue)
    : getDefaultValue();

  useEffect(() => {
    if (!requestedValue) setValue(value);
  }, [pathname, requestedValue, router, searchParams, value, setValue]);

  return [value, setValue];
}
