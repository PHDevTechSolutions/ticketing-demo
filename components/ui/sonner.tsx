"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      gap={8}
      icons={{
        success: <CircleCheckIcon className="size-3.5 text-green-500" />,
        info:    <InfoIcon         className="size-3.5 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-3.5 text-yellow-500" />,
        error:   <OctagonXIcon     className="size-3.5 text-red-500" />,
        loading: <Loader2Icon      className="size-3.5 animate-spin text-orange-500" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-start gap-3 w-full px-4 py-3 font-mono text-[11px] tracking-wide border bg-background dark:bg-[#080c10] border-border dark:border-white/10 shadow-2xl",
          title:
            "text-foreground/90 font-mono text-[11px] font-semibold uppercase tracking-widest leading-tight dark:text-[#e5e5d0]/90",
          description:
            "text-muted-foreground/40 font-mono text-[10px] leading-snug mt-0.5 dark:text-white/40",
          icon:
            "mt-0.5 shrink-0",
          actionButton:
            "mt-2 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 text-orange-500 border border-orange-500/40 hover:bg-orange-500/10 transition-colors cursor-pointer",
          cancelButton:
            "mt-2 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 text-muted-foreground/40 border border-border hover:text-orange-500 transition-colors cursor-pointer dark:text-white/40 dark:border-white/10",
          closeButton:
            "text-muted-foreground/20 hover:text-orange-500 transition-colors dark:text-white/20",
          success:
            "border-green-500/25",
          error:
            "border-red-500/25",
          warning:
            "border-yellow-500/25",
          info:
            "border-blue-500/25",
          loading:
            "border-orange-500/25",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
