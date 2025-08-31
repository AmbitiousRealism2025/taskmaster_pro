import { cn } from "@/lib/utils"
import React from "react"

export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 18, // Default for list items
  lg: 20, // Default for list items (alternative)
  xl: 24, // Default for cards
  '2xl': 32,
  '3xl': 48,
} as const

// Icon wrapper component
interface IconProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  size?: keyof typeof ICON_SIZES
  className?: string
}

export function Icon({ icon: IconComponent, size = 'md', className }: IconProps) {
  return React.createElement(IconComponent, {
    size: ICON_SIZES[size],
    className: cn("flex-shrink-0", className)
  })
}