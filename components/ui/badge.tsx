import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-primary border border-primary/30 [a&]:hover:bg-primary/30",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive/20 text-destructive border border-destructive/30 [a&]:hover:bg-destructive/30",
        outline:
          "text-white/70 border-white/20 [a&]:hover:bg-white/10 [a&]:hover:text-white",
        neon:
          "border-transparent bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] [a&]:hover:shadow-[0_0_25px_rgba(139,92,246,0.6)]",
        critical:
          "badge-critical",
        high:
          "badge-high",
        medium:
          "badge-medium",
        low:
          "badge-low",
        resolved:
          "badge-resolved",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
