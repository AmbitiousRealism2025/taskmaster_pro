/**
 * Global Test Teardown
 * Cleans up test environment after all tests complete
 */

import { FullConfig } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test cleanup...')

  try {
    // Clean up authentication state
    const authStatePath = 'tests/setup/auth-state.json'
    try {
      await fs.unlink(authStatePath)
      console.log('✅ Authentication state cleaned up')
    } catch (error) {
      console.log('ℹ️ No authentication state file to clean up')
    }

    // Clean up test database
    console.log('📊 Cleaning up test database...')
    // In a real implementation, this would clean up the test database
    // For now, we'll mock the cleanup

    // Clean up temporary files
    const tempDirs = [
      'test-results',
      'screenshots',
      'videos',
      'traces',
    ]

    for (const dir of tempDirs) {
      try {
        const dirPath = path.join(process.cwd(), dir)
        await fs.access(dirPath)
        
        // Keep the directories but clean old files (older than 7 days)
        const files = await fs.readdir(dirPath, { withFileTypes: true })
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
        
        for (const file of files) {
          if (file.isFile()) {
            const filePath = path.join(dirPath, file.name)
            const stats = await fs.stat(filePath)
            
            if (stats.mtime.getTime() < oneWeekAgo) {
              await fs.unlink(filePath)
              console.log(`🗑️ Cleaned up old file: ${file.name}`)
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist or other error, continue
      }
    }

    // Generate test summary
    console.log('📊 Generating test execution summary...')
    const summary = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      cleanup: {
        authState: 'cleaned',
        tempFiles: 'cleaned',
        testData: 'preserved for debugging',
      },
    }

    // Save summary for CI/CD reporting
    await fs.writeFile(
      'test-results/test-summary.json',
      JSON.stringify(summary, null, 2)
    )

    console.log('✅ Global test teardown completed successfully')

  } catch (error) {
    console.error('❌ Global teardown encountered issues:', error)
    // Don't throw error to avoid failing the entire test suite
  }
}

export default globalTeardown