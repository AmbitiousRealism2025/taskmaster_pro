import { Inter } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Export font configuration for layout usage
export const fontConfig = {
  sans: inter.variable,
}