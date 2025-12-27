"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * SWITCH COMPONENT
 * ================
 * Premium iOS-style toggle switch with smooth animations.
 * 
 * Design specs:
 * - Container: 44x24px (w-11 h-6)
 * - Thumb: 20x20px (w-5 h-5)
 * - Travel distance: 20px (translate-x-5 = 20px)
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base: iOS-style pill shape (44x24px)
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
        // Padding for thumb positioning
        "p-0.5",
        // Unchecked state: subtle dark background
        "bg-white/10",
        // Checked state: brand gradient
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-fuchsia-500 data-[state=checked]:to-purple-600",
        // Smooth transition
        "transition-colors duration-200 ease-in-out",
        // Focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Thumb: 20x20px circle
          "pointer-events-none block h-5 w-5 rounded-full",
          // White background with subtle shadow
          "bg-white shadow-md",
          // Smooth transition
          "transition-transform duration-200 ease-in-out",
          // Position: starts at left, slides 20px right when checked
          // Container inner: 44px - 4px padding = 40px
          // Thumb: 20px, so travel = 40 - 20 = 20px = translate-x-5
          "data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
