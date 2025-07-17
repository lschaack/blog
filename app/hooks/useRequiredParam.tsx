// Thanks Claude
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function requireQueryParam(
  searchParams: { [key: string]: string | string[] | undefined },
  name: string,
  getValue: () => string,
) {
  if (!searchParams[name]) {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || '/'
    const value = getValue()

    // Preserve existing search params
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        params.set(key, value)
      }
    })
    params.set(name, value)

    redirect(`${pathname}?${params.toString()}`)
  }
}
