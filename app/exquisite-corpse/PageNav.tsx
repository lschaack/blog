import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "../components/IconButton";

type PageNavProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
export function PageNav({ page, totalPages, onPageChange }: PageNavProps) {
  const maxPageCharCount = totalPages.toString().length;

  return (
    <nav className="flex justify-center">
      <ol className="flex items-center gap-4">
        <li>
          <IconButton
            onClick={() => onPageChange(1)}
            label="Back to first page"
            disabled={page === 1}
          >
            <ChevronFirst />
          </IconButton>
        </li>
        <li>
          <IconButton
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            label="Back to previous page"
            disabled={page <= 1}
          >
            <ChevronLeft />
          </IconButton>
        </li>
        <p className="bg-deep-50 px-4 rounded-lg font-geist-mono text-xl/loose single-row">
          {page.toString().padStart(maxPageCharCount, ' ')} / {totalPages.toString()}
        </p>
        <li>
          <IconButton
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            label="Forward to next page"
            disabled={page >= totalPages}
          >
            <ChevronRight />
          </IconButton>
        </li>
        <li>
          <IconButton
            onClick={() => onPageChange(totalPages)}
            label="Forward to last page"
            disabled={page === totalPages}
          >
            <ChevronLast />
          </IconButton>
        </li>
      </ol>
    </nav>
  )
}
