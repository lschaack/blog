import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

type PageNavProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
export function PageNav({ page, totalPages, onPageChange }: PageNavProps) {
  const maxPageCharCount = totalPages.toString().length;

  return (
    <nav className="flex justify-center">
      <ol className="flex gap-2 font-geist-mono">
        <li>
          <button onClick={() => onPageChange(1)}>
            <ChevronFirst />
          </button>
        </li>
        <li>
          <button onClick={() => onPageChange(Math.max(page - 1, 1))}>
            <ChevronLeft />
          </button>
        </li>
        <p>
          {page.toString().padStart(maxPageCharCount, ' ')} / {totalPages.toString()}
        </p>
        <li>
          <button onClick={() => onPageChange(Math.min(page + 1, totalPages))}>
            <ChevronRight />
          </button>
        </li>
        <li>
          <button onClick={() => onPageChange(totalPages)}>
            <ChevronLast />
          </button>
        </li>
      </ol>
    </nav>
  )
}
