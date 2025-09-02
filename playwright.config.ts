import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Enterprise E2E Testing
 * Optimized for TaskMaster Pro quality assurance and CI/CD integration
 */

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-results.xml' }],
    ['github'] // For GitHub Actions integration
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet browsers
    {
      name: 'tablet',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 }
      },
    },

    // Quality gates testing
    {
      name: 'quality-gates',
      testDir: './tests/quality-gates',
      use: { 
        ...devices['Desktop Chrome'],
        timeout: 60000, // Extended timeout for comprehensive quality checks
      },
    },

    // E2E testing
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { 
        ...devices['Desktop Chrome'],
        timeout: 30000,
      },
    },

    // Accessibility testing
    {
      name: 'accessibility',
      testDir: './tests/accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        timeout: 20000,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Global setup for authentication and test data
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),
})