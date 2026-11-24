import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li {...props} />
}

function PaginationLink({ className, isActive, size = "icon", ...props }: React.ComponentProps<typeof Button> & { isActive?: boolean }) {
  return <Button aria-current={isActive ? "page" : undefined} variant={isActive ? "outline" : "ghost"} size={size} className={cn(isActive && "border-primary text-primary", className)} {...props} />
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Go to previous page" size="sm" className={cn("gap-1 px-2.5", className)} {...props}><ChevronLeftIcon className="size-4" /><span>Previous</span></PaginationLink>
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return <PaginationLink aria-label="Go to next page" size="sm" className={cn("gap-1 px-2.5", className)} {...props}><span>Next</span><ChevronRightIcon className="size-4" /></PaginationLink>
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return <span aria-hidden="true" className={cn("flex size-9 items-center justify-center", className)} {...props}><MoreHorizontalIcon className="size-4" /><span className="sr-only">More pages</span></span>
}

export { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis }
