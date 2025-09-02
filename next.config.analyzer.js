/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 86400, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 604800, // 7 days
        },
      },
    },
  ],
})

const nextConfig = {
  reactStrictMode: true,
  
  // Optimize images
  images: {
    domains: ['localhost', 'taskmaster-pro.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Optimize bundle
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'recharts',
      'react-hook-form',
      '@tiptap/react',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },

  // Performance budgets
  performanceHints: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
  
  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable module concatenation
      config.optimization.concatenateModules = true
      
      // Split chunks configuration with aggressive optimization
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000, // 244KB max chunk size
        cacheGroups: {
          default: false,
          vendors: false,
          
          // Core framework (React, Next.js)
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          
          // Google APIs - separate chunk to enable dynamic loading
          googleApis: {
            name: 'google-apis',
            test: /[\\/]node_modules[\\/](googleapis|google-auth-library)[\\/]/,
            chunks: 'async', // Only load when needed
            priority: 35,
            enforce: true,
          },
          
          // TipTap editor - separate async chunk
          tiptap: {
            name: 'tiptap-editor',
            test: /[\\/]node_modules[\\/](@tiptap|prosemirror)[\\/]/,
            chunks: 'async',
            priority: 35,
            enforce: true,
          },
          
          // Recharts visualization - separate async chunk
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/,
            chunks: 'async',
            priority: 35,
            enforce: true,
          },
          
          // UI libraries
          ui: {
            name: 'ui-libs',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
            priority: 30,
            minChunks: 1,
            maxSize: 200000, // 200KB max for UI libs
          },
          
          // Common utilities
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
            maxSize: 150000, // 150KB max for commons
          },
          
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\\/]|$)/
              )[1]
              return `vendor.${packageName.replace('@', '').replace('/', '-')}`
            },
            priority: 10,
            chunks: 'async',
            maxSize: 200000, // 200KB max for vendor chunks
          }
        },
        maxAsyncRequests: 30,
        maxInitialRequests: 10, // Reduced from 30 to improve loading
      }

      // Performance budgets enforcement
      config.performance = {
        hints: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
        maxEntrypointSize: 250000, // 250KB max entrypoint
        maxAssetSize: 250000, // 250KB max asset size
        assetFilter: function(assetFilename) {
          // Only apply to JS files
          return assetFilename.endsWith('.js')
        }
      }
      
      // Minimize configuration  
      config.optimization.minimize = true
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      
      // Tree shaking for specific modules
      config.module = config.module || {}
      config.module.rules = config.module.rules || []
      config.module.rules.push({
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              ['import', { libraryName: '@tiptap/react', style: false }, '@tiptap/react'],
              ['import', { libraryName: 'recharts', style: false }, 'recharts'],
            ]
          }
        }
      })
      
      // Runtime chunk
      config.optimization.runtimeChunk = {
        name: 'runtime',
      }
    }
    
    // Add aliases for common paths
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/src',
      '@components': '/src/components',
      '@lib': '/src/lib',
      '@hooks': '/src/hooks',
      '@types': '/src/types',
      '@styles': '/src/styles',
    }
    
    return config
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
  
  // Redirects for common paths
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
    ]
  },
  
  // Generate source maps only in development
  productionBrowserSourceMaps: false,
  
  // Optimize server components
  serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

// Sentry configuration for error tracking
const sentryWebpackPluginOptions = {
  silent: true,
  org: 'taskmaster-pro',
  project: 'javascript-nextjs',
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
}

// Apply configurations in order
let finalConfig = nextConfig

// Only apply Sentry in production
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  finalConfig = withSentryConfig(finalConfig, sentryWebpackPluginOptions)
}

// Apply PWA
finalConfig = withPWA(finalConfig)

// Apply bundle analyzer last
finalConfig = withBundleAnalyzer(finalConfig)

module.exports = finalConfig