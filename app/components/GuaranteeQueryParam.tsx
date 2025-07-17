import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

type GuaranteeQueryParamProps = {
  name: string;
  getValue: () => string;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  children: ReactNode;
}
export const DefaultQueryParam = async ({
  searchParams,
  name,
  getValue,
  children,
}: GuaranteeQueryParamProps) => {
  if (!(await searchParams)[name]) {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '/';
    const params = new URLSearchParams()

    Object.entries(searchParams).forEach(([key, value]) => params.set(key, value));

    params.set(name, getValue().toString());

    redirect(`/${pathname}?${params.toString()}`);
  }

  return children;
}
