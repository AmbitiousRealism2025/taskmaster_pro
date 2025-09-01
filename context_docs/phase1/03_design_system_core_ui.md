# Phase 1: Design System & Core UI Coding Context

## ⚠️ Implementation Notes
- **Subgroup Number**: 3 (Design System & Core UI)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 4
- **Test Coverage**: docs/04-testing/Phase1_Foundation_Tests.md (Tests 12-17)
- **Dependencies**: Infrastructure Foundation (Subgroup 1) must be complete
- **Related Enhancements**: None
- **Estimated Context Usage**: 45-55%

---

**Subgroup**: 03 - Design System & Core UI  
**Phase**: Foundation & Infrastructure (Week 2)  
**Focus**: Frontend + UI/UX Systems  

## Subgroup Overview

The Design System & Core UI subgroup is responsible for establishing the visual and interaction foundation of TaskMaster Pro. This includes creating a comprehensive design system with reusable components, implementing theme management, and ensuring accessibility compliance across all UI elements.

### Primary Responsibilities

- **Component Library**: Create shadcn/ui-based component system with TaskMaster Pro customizations
- **Theme System**: Implement light/dark mode with CSS custom properties and next-themes
- **Design Tokens**: Establish color scales, typography, spacing, and animation variables
- **Accessibility Foundation**: Ensure WCAG 2.1 AA compliance with proper ARIA labels and keyboard navigation
- **Animation System**: Integrate Framer Motion for smooth transitions and micro-interactions
- **Responsive Design**: Create mobile-first layout patterns and breakpoint strategies

## Test Coverage Requirements

Based on `docs/04-testing/Phase1_Foundation_Tests.md`, the following tests must pass:

### Core UI Component Tests (4 tests)
- **Card Component** (`__tests__/components/ui/card.test.ts`)
  - Basic card structure rendering
  - CSS class application for styling
  - Variant prop support (elevated, interactive)
  - Hover state transitions

### Theme System Tests (4 tests)
- **Theme Toggle** (`__tests__/components/ui/theme-toggle.test.ts`)
  - Theme toggle button rendering
  - Light/dark theme switching functionality
  - Theme-aware icon display
  - Theme preference persistence in localStorage

### Layout Component Tests (Integration with other subgroups)
- Navigation and sidebar components (coordinated with Navigation subgroup)
- Dashboard layout components (coordinated with Dashboard subgroup)

## Design Tokens & CSS Custom Properties

### Color System

```css
/* CSS Custom Properties - colors.css */
:root {
  /* Brand Colors - Purple to Teal Gradient */
  --brand-primary: #8b5cf6; /* violet-500 */
  --brand-secondary: #06b6d4; /* cyan-500 */
  --brand-tertiary: #14b8a6; /* teal-500 */
  
  /* Semantic Colors */
  --color-background: #ffffff;
  --color-foreground: #0f172a; /* slate-900 */
  --color-muted: #f8fafc; /* slate-50 */
  --color-muted-foreground: #64748b; /* slate-500 */
  --color-border: #e2e8f0; /* slate-200 */
  --color-input: #ffffff;
  
  /* Priority Colors */
  --priority-high: #f43f5e; /* rose-500 */
  --priority-medium: #f59e0b; /* amber-500 */
  --priority-low: #10b981; /* emerald-500 */
  
  /* Status Colors */
  --status-success: #10b981; /* emerald-500 */
  --status-warning: #f59e0b; /* amber-500 */
  --status-error: #ef4444; /* red-500 */
  --status-info: #3b82f6; /* blue-500 */
}

[data-theme="dark"] {
  --color-background: #020617; /* slate-950 */
  --color-foreground: #f8fafc; /* slate-50 */
  --color-muted: #0f172a; /* slate-900 */
  --color-muted-foreground: #94a3b8; /* slate-400 */
  --color-border: #1e293b; /* slate-800 */
  --color-input: #0f172a; /* slate-900 */
}
```

### Typography Scale

```css
/* Typography - typography.css */
:root {
  /* Font Families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  
  /* Font Sizes */
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem; /* 36px */
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

### Spacing & Layout

```css
/* Spacing - spacing.css */
:root {
  /* Spacing Scale */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
  
  /* Border Radius */
  --radius-sm: 0.125rem; /* 2px */
  --radius-md: 0.375rem; /* 6px */
  --radius-lg: 0.5rem; /* 8px */
  --radius-xl: 0.75rem; /* 12px */
  --radius-2xl: 1rem; /* 16px */
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

## shadcn/ui Component Patterns

### Base Component Structure

```typescript
// components/ui/card.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva(
  "rounded-2xl border bg-card text-card-foreground shadow-sm transition-shadow",
  {
    variants: {
      variant: {
        default: "",
        elevated: "shadow-lg",
        interactive: "hover:shadow-md cursor-pointer",
        glassy: "backdrop-blur-sm bg-white/80 dark:bg-slate-900/80"
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// Additional card components...
export { Card, CardHeader, CardContent, CardDescription, CardFooter, CardTitle }
```

### Button Component with Priority Colors

```typescript
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
        // Priority-specific variants
        priority: "text-white font-medium",
      },
      priority: {
        high: "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
        medium: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
        low: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-xl",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

## Theme System Implementation

### Theme Provider Setup

```typescript
// components/theme/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// app/layout.tsx integration
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Theme Toggle Component

```typescript
// components/ui/theme-toggle.tsx
"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" data-testid="sun-icon" />
      ) : (
        <Moon className="h-4 w-4" data-testid="moon-icon" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

## Typography System

### Font Loading Strategy

```typescript
// lib/fonts.ts
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const sfMono = localFont({
  src: [
    {
      path: '../public/fonts/SFMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/SFMono-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
  display: 'swap',
})

// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
    },
  },
}
```

### Typography Components

```typescript
// components/ui/typography.tsx
import { cn } from "@/lib/utils"

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

export function TypographyH1({ children, className }: TypographyProps) {
  return (
    <h1 className={cn(
      "scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl",
      className
    )}>
      {children}
    </h1>
  )
}

export function TypographyH2({ children, className }: TypographyProps) {
  return (
    <h2 className={cn(
      "scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0",
      className
    )}>
      {children}
    </h2>
  )
}

export function TypographyP({ children, className }: TypographyProps) {
  return (
    <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}>
      {children}
    </p>
  )
}

export function TypographyLead({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-xl text-muted-foreground", className)}>
      {children}
    </p>
  )
}
```

## Icon System with Lucide React

### Icon Size Standards

```typescript
// lib/icon-config.ts
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
  return (
    <IconComponent 
      size={ICON_SIZES[size]} 
      className={cn("flex-shrink-0", className)}
    />
  )
}
```

### Icon Usage Examples

```typescript
import { CheckCircle, FolderOpen, Clock } from 'lucide-react'

// List items (18-20px)
<Icon icon={CheckCircle} size="md" className="text-green-500" />

// Cards (24px)
<Icon icon={FolderOpen} size="xl" className="text-blue-500" />

// Navigation (20px)
<Icon icon={Clock} size="lg" className="text-slate-600" />
```

## Animation Patterns with Framer Motion

### Base Animation Configuration

```typescript
// lib/animations.ts
import { Variants } from "framer-motion"

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
}

export const cardHover = {
  hover: { 
    y: -2, 
    shadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    transition: { duration: 0.2 }
  }
}
```

### Animated Components

```typescript
// components/ui/animated-card.tsx
"use client"

import { motion } from "framer-motion"
import { Card, CardProps } from "./card"
import { slideUp, cardHover } from "@/lib/animations"

interface AnimatedCardProps extends CardProps {
  index?: number
}

export function AnimatedCard({ index = 0, children, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={{
        ...slideUp,
        visible: {
          ...slideUp.visible,
          transition: {
            ...slideUp.visible.transition,
            delay: index * 0.1
          }
        }
      }}
      whileHover={cardHover.hover}
    >
      <Card {...props}>
        {children}
      </Card>
    </motion.div>
  )
}
```

## Accessibility Standards (WCAG 2.1 AA)

### Focus Management

```css
/* Focus styles - focus.css */
.focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Custom focus rings for components */
.custom-focus:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-background), 0 0 0 4px var(--color-primary);
}
```

### Screen Reader Support

```typescript
// components/ui/visually-hidden.tsx
import { cn } from "@/lib/utils"

interface VisuallyHiddenProps {
  children: React.ReactNode
  className?: string
}

export function VisuallyHidden({ children, className }: VisuallyHiddenProps) {
  return (
    <span className={cn(
      "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
      "clip-rect(0_0_0_0)",
      className
    )}>
      {children}
    </span>
  )
}

// Usage in components
<Button>
  <Icon icon={Plus} />
  <VisuallyHidden>Add new task</VisuallyHidden>
</Button>
```

### ARIA Labels and Roles

```typescript
// Accessibility utilities
export const a11yProps = {
  // For interactive elements
  button: (label: string) => ({
    role: "button",
    "aria-label": label,
    tabIndex: 0,
  }),
  
  // For form controls
  input: (label: string, required = false) => ({
    "aria-label": label,
    "aria-required": required,
  }),
  
  // For status updates
  status: (message: string) => ({
    role: "status",
    "aria-live": "polite",
    "aria-label": message,
  }),
  
  // For alerts
  alert: (message: string) => ({
    role: "alert",
    "aria-live": "assertive",
    "aria-label": message,
  }),
}
```

## Component Library Structure

```
components/
├── ui/                     # Base shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── theme-toggle.tsx
│   └── typography.tsx
├── theme/                  # Theme-related components
│   ├── theme-provider.tsx
│   └── theme-script.tsx
├── layout/                 # Layout components
│   ├── header.tsx
│   ├── navigation.tsx
│   └── sidebar.tsx
└── animated/               # Framer Motion wrappers
    ├── animated-card.tsx
    ├── page-transition.tsx
    └── stagger-container.tsx
```

## Responsive Design Patterns

### Breakpoint System

```typescript
// lib/breakpoints.ts
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Mobile-first utilities
export const useBreakpoint = (breakpoint: keyof typeof breakpoints) => {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const query = `(min-width: ${breakpoints[breakpoint]})`
    const media = window.matchMedia(query)
    
    setMatches(media.matches)
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [breakpoint])
  
  return matches
}
```

### Container Patterns

```typescript
// components/ui/container.tsx
interface ContainerProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function Container({ children, size = 'lg', className }: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl', 
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  }
  
  return (
    <div className={cn(
      'mx-auto px-4 sm:px-6 lg:px-8',
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  )
}
```

## Integration with Other Subgroups

### Navigation Integration
- Provide theme toggle component for header
- Define navigation link states and animations
- Ensure accessibility for keyboard navigation

### Authentication Integration
- Create form components (inputs, buttons, cards)
- Implement loading states and error handling
- Provide OAuth button components with brand styling

### Dashboard Integration
- Supply metric cards with priority color coding
- Create animated quick action buttons
- Provide chart color palettes matching brand colors

### Database Integration
- Define loading skeleton components
- Create error boundary styling
- Implement optimistic UI patterns

## Testing Strategy

### Component Testing Approach

```typescript
// __tests__/components/ui/card.test.ts
import { render, screen } from '@testing-library/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

describe('Card Component', () => {
  it('should render with proper semantic structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    )
    
    // Test semantic structure
    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })
  
  it('should meet accessibility standards', () => {
    render(<Card aria-label="Task card">Content</Card>)
    
    const card = screen.getByRole('article')
    expect(card).toHaveAccessibleName('Task card')
    expect(card).toHaveAttribute('tabIndex', '0')
  })
})
```

### Visual Regression Testing

```typescript
// __tests__/visual/components.spec.ts (Playwright)
import { test, expect } from '@playwright/test'

test.describe('Component Visual Tests', () => {
  test('Card components render correctly', async ({ page }) => {
    await page.goto('/components/cards')
    
    // Test light theme
    await expect(page.locator('[data-testid="card-variants"]')).toHaveScreenshot('cards-light.png')
    
    // Test dark theme
    await page.click('[aria-label="Toggle theme"]')
    await expect(page.locator('[data-testid="card-variants"]')).toHaveScreenshot('cards-dark.png')
  })
})
```

## Performance Considerations

### CSS Optimization

```css
/* Critical CSS extraction */
@layer base, components, utilities;

@layer base {
  /* Essential styles loaded first */
  :root { /* design tokens */ }
  html { /* base styles */ }
}

@layer components {
  /* Component-specific styles */
  .card { /* card styles */ }
}

@layer utilities {
  /* Utility classes loaded last */
  .text-balance { text-wrap: balance; }
}
```

### Bundle Splitting

```typescript
// Dynamic imports for animations
const AnimatedCard = dynamic(
  () => import('@/components/ui/animated-card'),
  { ssr: false }
)

// Conditional animation loading
const MotionDiv = motion.div // Only loaded when needed
```

## Implementation Priority

### Week 2 Development Order

1. **Day 1-2**: Design tokens and CSS custom properties setup
2. **Day 3**: Core shadcn/ui components (Card, Button, Input)
3. **Day 4**: Theme system and ThemeToggle component
4. **Day 5**: Typography system and accessibility foundations
5. **Day 6-7**: Animation system and responsive patterns

### Critical Path Dependencies

- **CSS Custom Properties** → All other components
- **Theme Provider** → Theme-aware components
- **Base Components** → Complex composite components
- **Accessibility Foundation** → All interactive elements

This comprehensive design system provides the visual and interaction foundation for TaskMaster Pro, ensuring consistency, accessibility, and performance across the entire application.