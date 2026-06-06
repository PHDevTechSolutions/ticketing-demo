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
        success: <CircleCheckIcon className="size-3.5 text-[#22c55e]" />,
        info:    <InfoIcon         className="size-3.5 text-[#3b82f6]" />,
        warning: <TriangleAlertIcon className="size-3.5 text-[#eab308]" />,
        error:   <OctagonXIcon     className="size-3.5 text-[#ef4444]" />,
        loading: <Loader2Icon      className="size-3.5 animate-spin text-[#f97316]" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-start gap-3 w-full px-4 py-3 font-mono text-[11px] tracking-wide border bg-[#080c10] border-white/10 shadow-2xl",
          title:
            "text-[#e5e5d0]/90 font-mono text-[11px] font-semibold uppercase tracking-widest leading-tight",
          description:
            "text-white/40 font-mono text-[10px] leading-snug mt-0.5",
          icon:
            "mt-0.5 shrink-0",
          actionButton:
            "mt-2 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 text-[#f97316] border border-[#f97316]/40 hover:bg-[#f97316]/10 transition-colors cursor-pointer",
          cancelButton:
            "mt-2 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 text-white/40 border border-white/10 hover:text-[#f97316] transition-colors cursor-pointer",
          closeButton:
            "text-white/20 hover:text-[#f97316] transition-colors",
          success:
            "border-[#22c55e]/25 bg-[#080c10]",
          error:
            "border-[#ef4444]/25 bg-[#080c10]",
          warning:
            "border-[#eab308]/25 bg-[#080c10]",
          info:
            "border-[#3b82f6]/25 bg-[#080c10]",
          loading:
            "border-[#f97316]/25 bg-[#080c10]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
