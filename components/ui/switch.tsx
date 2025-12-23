"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Fixed: Proper pill-shaped toggle (h-5 w-9 = 20x36px = 1.8:1 ratio)
        // Previous: h-[1.15rem] w-8 created egg shape on mobile
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none",
        // States
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-fuchsia-500 data-[state=checked]:to-purple-600",
        "data-[state=unchecked]:bg-white/10",
        // Focus
        "focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Fixed: Thumb size proportional to container (h-4 in h-5 container = good padding)
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md ring-0 transition-transform",
          // Translate needs to account for: container width (36px) - thumb width (16px) - padding (2px each side) = 14px travel
          "data-[state=checked]:translate-x-[calc(100%+2px)]",
          "data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
