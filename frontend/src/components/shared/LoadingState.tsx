import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingState({ label = "Loading", rows = 3, className = "" }: { label?: string; rows?: number; className?: string }) {
  return (
    <div role="status" aria-label={label} className={`space-y-3 ${className}`}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-3 w-3/5" /></div>
        </div>
      ))}
    </div>
  )
}
