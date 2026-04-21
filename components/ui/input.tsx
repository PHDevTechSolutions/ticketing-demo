import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground bg-[#0a0a0f] border-[rgba(255,255,255,0.1)] h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-white",
        "focus-visible:border-[#8b5cf6] focus-visible:shadow-[0_0_0_3px_rgba(139,92,246,0.3)] focus-visible:ring-0",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "hover:border-[rgba(139,92,246,0.3)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
