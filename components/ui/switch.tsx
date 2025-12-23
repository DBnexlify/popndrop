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
 * - Container: 44x24px (standard iOS toggle size)
 * - Thumb: 20x20px with 2px inset from edges
 * - Smooth spring-like transition
 * - Gradient background when checked (fuchsia → purple)
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
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
        // Border & shadow for depth
        "border-2 border-transparent",
        "shadow-inner",
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
          "bg-white shadow-lg",
          // Ring for definition
          "ring-0",
          // Smooth spring-like transition
          "transition-transform duration-200 ease-in-out",
          // Position: 2px from left when unchecked, slides to right when checked
          // Container is 44px (w-11), thumb is 20px (w-5)
          // Travel distance: 44 - 20 - 4 (2px padding each side) = 20px
          "data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:translate-x-[22px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
