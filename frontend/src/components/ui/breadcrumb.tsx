import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" className={cn("text-sm", className)} {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol className={cn("flex flex-wrap items-center gap-1.5 break-words text-muted-foreground sm:gap-2", className)} {...props} />
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />
}

function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) {
  return <a className={cn("transition-colors hover:text-foreground", className)} {...props} />
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span aria-current="page" aria-disabled="true" className={cn("font-medium text-foreground", className)} {...props} />
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return <li role="presentation" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>{children ?? <ChevronRightIcon />}</li>
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return <span role="presentation" aria-hidden="true" className={cn("flex size-8 items-center justify-center", className)} {...props}><MoreHorizontalIcon className="size-4" /><span className="sr-only">More</span></span>
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis }
