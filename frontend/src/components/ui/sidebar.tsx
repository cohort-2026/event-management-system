import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SidebarContextValue { open: boolean; setOpen: (open: boolean) => void; toggle: () => void }
const SidebarContext = createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const value = useContext(SidebarContext)
  if (!value) throw new Error("Sidebar components must be used inside SidebarProvider")
  return value
}

function SidebarProvider({ children, defaultOpen = true, open: controlledOpen, onOpenChange }: { children: ReactNode; defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => { if (controlledOpen === undefined) setUncontrolledOpen(next); onOpenChange?.(next) }
  const value = useMemo(() => ({ open, setOpen, toggle: () => setOpen(!open) }), [open])
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

function Sidebar({ className, side = "left", collapsible: _collapsible = "offcanvas", ...props }: React.ComponentProps<"aside"> & { side?: "left" | "right"; collapsible?: "offcanvas" | "icon" | "none" }) {
  const { open } = useSidebar()
  return <aside data-slot="sidebar" data-state={open ? "expanded" : "collapsed"} data-side={side} className={cn("flex h-full min-h-0 flex-col border-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200", side === "left" ? "border-r" : "border-l", !open && "hidden", className)} {...props} />
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return <main data-slot="sidebar-inset" className={cn("min-w-0 flex-1 bg-background", className)} {...props} />
}

function SidebarTrigger({ className, children, onClick, ...props }: React.ComponentProps<"button">) {
  const { toggle, open } = useSidebar()
  return <button type="button" data-slot="sidebar-trigger" aria-label={open ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={open} className={cn("inline-flex size-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40", className)} onClick={event => { toggle(); onClick?.(event) }} {...props}>{children ?? <span aria-hidden="true">☰</span>}</button>
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 p-3", className)} {...props} />
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("flex flex-col gap-2 p-3", className)} {...props} />
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-content" className={cn("min-h-0 flex-1 overflow-auto p-3", className)} {...props} />
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"section">) {
  return <section data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col p-1", className)} {...props} />
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-label" className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("group/sidebar-menu-item relative", className)} {...props} />
}

function SidebarMenuButton({ className, isActive = false, ...props }: React.ComponentProps<"button"> & { isActive?: boolean }) {
  return <button type="button" data-slot="sidebar-menu-button" data-active={isActive} className={cn("flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/40 disabled:pointer-events-none disabled:opacity-50", isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground", className)} {...props} />
}

export { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarFooter, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar }
