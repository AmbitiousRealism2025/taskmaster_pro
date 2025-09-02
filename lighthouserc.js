module.exports = {
  ci: {
    // Lighthouse CI configuration
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/tasks',
        'http://localhost:3000/projects',
        'http://localhost:3000/notes',
      ],
      startServerCommand: 'npm start',
      numberOfRuns: 3,
      settings: {
        // Use headless Chrome
        chromeFlags: '--no-sandbox --headless --disable-gpu',
        // Skip certain audits for CI
        skipAudits: [
          'canonical',
          'manifest-short-name-length',
          'unused-javascript',
          'uses-long-cache-ttl',
        ],
        // Custom performance budget
        budgets: [
          {
            path: '/*',
            resourceSizes: [
              {
                resourceType: 'script',
                budget: 500,
              },
              {
                resourceType: 'stylesheet',
                budget: 100,
              },
              {
                resourceType: 'image',
                budget: 1000,
              },
              {
                resourceType: 'total',
                budget: 2000,
              },
            ],
            timings: [
              {
                metric: 'first-contentful-paint',
                budget: 2000,
              },
              {
                metric: 'largest-contentful-paint',
                budget: 2500,
              },
              {
                metric: 'speed-index',
                budget: 3000,
              },
              {
                metric: 'cumulative-layout-shift',
                budget: 0.1,
              },
              {
                metric: 'max-potential-fid',
                budget: 100,
              },
            ],
          },
        ],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      // Performance assertions
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.8 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'max-potential-fid': ['error', { maxNumericValue: 100 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        
        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 1000000 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 2000000 }],
        
        // Security and best practices
        'is-on-https': 'error',
        'uses-http2': 'warn',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'error',
        
        // PWA requirements
        'service-worker': 'error',
        'installable-manifest': 'error',
        'works-offline': 'error',
        
        // Performance best practices
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'uses-webp-images': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'error',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        'preload-lcp-image': 'warn',
        'prioritize-lcp-image': 'warn',
      },
    },
  },
}