import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusTone = "success" | "warning" | "danger" | "neutral" | "brand"

const toneByStatus: Record<string, StatusTone> = {
  APPROVED: "success", PAID: "success", CONFIRMED: "success", USED: "success", COMPLETED: "success",
  PENDING: "warning", PENDING_REVIEW: "warning", PENDING_APPROVAL: "warning", ISSUED: "warning",
  FAILED: "danger", REJECTED: "danger",
  DRAFT: "neutral", NOT_REQUIRED: "neutral", CANCELLED: "neutral", VOID: "neutral",
  PUBLISHED: "brand", ACTIVE: "brand",
}

const toneClasses: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-success-bg text-success-text",
  warning: "border-amber-200 bg-warning-bg text-warning-text",
  danger: "border-rose-200 bg-danger-bg text-danger-text",
  neutral: "border-stone-200 bg-surface-sunken text-stone-700",
  brand: "border-accent-500/25 bg-accent-500/10 text-accent-600",
}

function readableStatus(status: string) {
  return status.toLowerCase().split("_").map(part => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ")
}

export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  const normalized = status.trim().toUpperCase()
  return <Badge variant="outline" className={cn("border px-2 py-0.5 font-medium", toneClasses[toneByStatus[normalized] ?? "neutral"], className)}>{readableStatus(status)}</Badge>
}

export { toneByStatus }
