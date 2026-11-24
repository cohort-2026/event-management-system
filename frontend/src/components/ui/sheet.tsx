import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out", className)} {...props} />
}

function SheetContent({ className, children, side = "right", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "top" | "right" | "bottom" | "left" }) {
  const sides = { right: "inset-y-0 right-0 h-full w-[min(24rem,calc(100vw-2rem))] border-l data-[state=open]:slide-in-from-right", left: "inset-y-0 left-0 h-full w-[min(24rem,calc(100vw-2rem))] border-r data-[state=open]:slide-in-from-left", top: "inset-x-0 top-0 max-h-[85dvh] border-b data-[state=open]:slide-in-from-top", bottom: "inset-x-0 bottom-0 max-h-[85dvh] border-t data-[state=open]:slide-in-from-bottom" }
  return <SheetPortal><SheetOverlay /><DialogPrimitive.Content data-slot="sheet-content" className={cn("fixed z-50 overflow-y-auto border-border bg-background p-6 text-foreground shadow-xl transition duration-200 focus:outline-none", sides[side], className)} {...props}>{children}<DialogPrimitive.Close aria-label="Close panel" className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"><XIcon className="size-4" /></DialogPrimitive.Close></DialogPrimitive.Content></SheetPortal>
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-heading text-lg font-semibold", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
