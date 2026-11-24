import type { ReactNode } from "react"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import EmptyState from "./EmptyState"
import LoadingState from "./LoadingState"

export interface DataTableColumn<Row> {
  id: string
  header: ReactNode
  cell: (row: Row) => ReactNode
  className?: string
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  getRowId: (row: Row) => string
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  className?: string
}

export default function DataTable<Row>({
  columns,
  rows,
  getRowId,
  loading = false,
  emptyTitle = "No results found",
  emptyDescription = "There are no records to show here yet.",
  emptyAction,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  page = 1,
  pageSize = 10,
  total = rows.length,
  onPageChange,
  className,
}: DataTableProps<Row>) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)))
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(number => Math.abs(number - currentPage) <= 2)

  return (
    <section className={className}>
      {(onSearchChange || filters) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {onSearchChange && <label className="relative block w-full sm:max-w-xs">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={searchValue ?? ""} onChange={event => onSearchChange(event.currentTarget.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="pl-9" />
          </label>}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        </div>
      )}
      {loading ? <div className="rounded-lg border border-border bg-card p-4"><LoadingState label="Loading records" rows={4} /></div> : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table className="min-w-[640px]">
            <TableHeader><TableRow>{columns.map(column => <TableHead key={column.id} className={column.className}>{column.header}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{rows.map(row => <TableRow key={getRowId(row)}>{columns.map(column => <TableCell key={column.id} className={column.className}>{column.cell(row)}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
        </div>
      )}
      {!loading && onPageChange && pageCount > 1 && <Pagination className="mt-4">
        <PaginationContent className="flex-wrap">
          <PaginationItem><PaginationPrevious onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} /></PaginationItem>
          {visiblePages.map(number => <PaginationItem key={number}><PaginationLink isActive={number === currentPage} aria-label={`Page ${number}`} onClick={() => onPageChange(number)}>{number}</PaginationLink></PaginationItem>)}
          <PaginationItem><PaginationNext onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} /></PaginationItem>
        </PaginationContent>
      </Pagination>}
    </section>
  )
}
