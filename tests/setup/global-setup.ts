/**
 * Global Test Setup
 * Prepares test environment and authentication for E2E tests
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up global test environment...')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Setup test database
    console.log('📊 Setting up test database...')
    // In a real implementation, this would set up a test database
    // For now, we'll mock the setup

    // Create test user for authenticated tests
    console.log('👤 Creating test user...')
    await page.goto('http://localhost:3000/auth/signup')
    
    // Fill registration form (if not already exists)
    try {
      await page.fill('[data-testid="email"]', 'test@example.com')
      await page.fill('[data-testid="password"]', 'TestPassword123!')
      await page.fill('[data-testid="confirm-password"]', 'TestPassword123!')
      await page.click('[data-testid="signup-button"]')
      console.log('✅ Test user created successfully')
    } catch (error) {
      console.log('ℹ️ Test user may already exist')
    }

    // Save authentication state
    console.log('🔐 Saving authentication state...')
    await page.goto('http://localhost:3000/auth/signin')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'TestPassword123!')
    await page.click('[data-testid="signin-button"]')
    await page.waitForURL('**/dashboard')

    // Save the signed-in state to be reused in tests
    await context.storageState({ path: 'tests/setup/auth-state.json' })
    console.log('✅ Authentication state saved')

    // Setup test data
    console.log('📝 Setting up test data...')
    // Create sample tasks, projects, habits for testing
    await page.goto('http://localhost:3000/tasks')
    
    // Create test tasks if not exist
    try {
      await page.click('[data-testid="create-task-button"]')
      await page.fill('[data-testid="task-title"]', 'Test Task 1')
      await page.fill('[data-testid="task-description"]', 'Test task for E2E testing')
      await page.click('[data-testid="save-task"]')
      console.log('✅ Test data created')
    } catch (error) {
      console.log('ℹ️ Test data may already exist')
    }

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
    console.log('✅ Global test setup completed')
  }
}

export default globalSetup