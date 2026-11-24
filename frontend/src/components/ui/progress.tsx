import { Progress as ProgressPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const safeValue = Math.min(100, Math.max(0, value ?? 0))
  return (
    <ProgressPrimitive.Root data-slot="progress" value={safeValue} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)} {...props}>
      <ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-primary transition-transform" style={{ transform: `translateX(-${100 - safeValue}%)` }} />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
