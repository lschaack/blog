import Link from "next/link";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

type PageNavProps = {
  page: number;
  totalPages: number;
}
export function PageNav({ page, totalPages }: PageNavProps) {
  const maxPageCharCount = totalPages.toString().length;

  return (
    <nav className="flex justify-center">
      <ol className="flex gap-2 font-geist-mono">
        <li>
          <Link href="?page=1">
            <ChevronFirst />
          </Link>
        </li>
        <li>
          <Link href={`?page=${Math.max(page - 1, 1)}`}>
            <ChevronLeft />
          </Link>
        </li>
        <p>
          {page.toString().padStart(maxPageCharCount, ' ')} / {totalPages.toString()}
        </p>
        <li>
          <Link href={`?page=${Math.min(page + 1, totalPages)}`}>
            <ChevronRight />
          </Link>
        </li>
        <li>
          <Link href={`?page=${totalPages}`}>
            <ChevronLast />
          </Link>
        </li>
      </ol>
    </nav>
  )
}
