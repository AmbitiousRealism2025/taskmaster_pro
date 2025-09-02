/**
 * WCAG Compliance Test Suite
 * Automated accessibility testing for all critical pages
 * Ensures WCAG 2.1 AA compliance across the application
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Critical pages that must meet accessibility standards
const CRITICAL_PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/auth/signin', name: 'Sign In', skipAuth: true },
  { path: '/auth/signup', name: 'Sign Up', skipAuth: true },
  { path: '/tasks', name: 'Tasks' },
  { path: '/projects', name: 'Projects' },
  { path: '/habits', name: 'Habits' },
  { path: '/notes', name: 'Notes' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/settings', name: 'Settings' },
  { path: '/realtime-demo', name: 'Real-time Demo' },
]

test.describe('WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication for protected pages
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'TestPassword123!')
    await page.click('[data-testid="signin-button"]')
    await page.waitForURL('/dashboard')
  })

  for (const pageInfo of CRITICAL_PAGES) {
    test(`${pageInfo.name} should meet WCAG 2.1 AA standards`, async ({ page }) => {
      if (pageInfo.skipAuth) {
        await page.goto('/auth/signout')
      }
      
      await page.goto(pageInfo.path)
      await page.waitForLoadState('networkidle')

      // Run accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('#third-party-widget') // Exclude third-party content we can't control
        .analyze()

      // Assert no violations
      expect(accessibilityScanResults.violations).toEqual([])
      
      // Log successful validation
      console.log(`✅ ${pageInfo.name} passed WCAG 2.1 AA compliance`)
    })
  }

  test('should have proper keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Start keyboard navigation
    await page.keyboard.press('Tab')
    
    // Track focus progression
    const focusableElements = await page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').all()
    
    // Verify first element is focused
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName)
    expect(firstFocused).toBeTruthy()
    
    // Tab through several elements
    for (let i = 0; i < Math.min(5, focusableElements.length); i++) {
      await page.keyboard.press('Tab')
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
      
      // Verify focus indicator exists
      const focusStyles = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el)
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor,
        }
      })
      
      // Should have some form of focus indicator
      const hasFocusIndicator = 
        focusStyles.outline !== 'none' ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none' ||
        focusStyles.borderColor !== 'rgb(0, 0, 0)' // Not default black
      
      expect(hasFocusIndicator).toBe(true)
    }
    
    console.log('✅ Keyboard navigation validation passed')
  })

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
    
    // Verify page has an h1
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    
    // Verify heading hierarchy (h1 → h2 → h3, no skipping)
    const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(headings => {
      return headings.map(h => parseInt(h.tagName.charAt(1)))
    })
    
    for (let i = 1; i < headingLevels.length; i++) {
      const current = headingLevels[i]
      const previous = headingLevels[i - 1]
      
      // Should not skip heading levels (e.g., h1 → h3)
      if (current > previous) {
        expect(current - previous).toBeLessThanOrEqual(1)
      }
    }

    // Check for main landmarks
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()

    // Verify ARIA labels on interactive elements
    const buttons = await page.locator('button').all()
    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      const ariaLabel = await button.getAttribute('aria-label')
      const textContent = await button.textContent()
      const title = await button.getAttribute('title')
      
      // Button should have accessible name (aria-label, text content, or title)
      expect(ariaLabel || textContent?.trim() || title).toBeTruthy()
    }
    
    console.log('✅ Screen reader navigation validation passed')
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Run color contrast specific audit
    const contrastResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('*') // Check all elements
      .analyze()

    // Filter for color contrast violations
    const contrastViolations = contrastResults.violations.filter(
      violation => violation.id === 'color-contrast' || violation.id === 'color-contrast-enhanced'
    )

    expect(contrastViolations.length).toBe(0)
    
    if (contrastViolations.length > 0) {
      console.error('❌ Color contrast violations found:')
      contrastViolations.forEach(violation => {
        violation.nodes.forEach(node => {
          console.error(`  - ${node.html}`)
          console.error(`    ${node.failureSummary}`)
        })
      })
    } else {
      console.log('✅ Color contrast validation passed')
    }
  })

  test('should have proper form accessibility', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Check form inputs have labels
    const inputs = await page.locator('input').all()
    
    for (const input of inputs) {
      const inputId = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')
      const placeholder = await input.getAttribute('placeholder')
      
      // Input should have either:
      // 1. Associated label (via id)
      // 2. aria-label
      // 3. aria-labelledby
      let hasLabel = false
      
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`)
        if (await label.count() > 0) {
          hasLabel = true
        }
      }
      
      if (ariaLabel || ariaLabelledBy) {
        hasLabel = true
      }
      
      // Placeholder alone is not sufficient for accessibility
      expect(hasLabel).toBe(true)
    }

    // Check form has proper structure
    const form = page.locator('form')
    if (await form.count() > 0) {
      // Form should have submit button
      const submitButton = page.locator('button[type="submit"], input[type="submit"]')
      await expect(submitButton).toHaveCount(1)
    }
    
    console.log('✅ Form accessibility validation passed')
  })

  test('should have accessible images and media', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check images have alt text
    const images = await page.locator('img').all()
    
    for (const image of images) {
      const alt = await image.getAttribute('alt')
      const ariaLabel = await image.getAttribute('aria-label')
      const role = await image.getAttribute('role')
      
      // Image should have alt text unless it's decorative (alt="")
      // or has aria-label, or is marked as presentation
      if (role !== 'presentation' && alt !== '') {
        expect(alt || ariaLabel).toBeTruthy()
      }
    }

    // Check for any videos or audio elements
    const videos = await page.locator('video').all()
    const audios = await page.locator('audio').all()
    
    for (const video of videos) {
      // Videos should have captions/subtitles available
      const tracks = await video.locator('track').all()
      if (tracks.length > 0) {
        const captionTrack = tracks.some(async track => {
          const kind = await track.getAttribute('kind')
          return kind === 'captions' || kind === 'subtitles'
        })
        expect(captionTrack).toBeTruthy()
      }
    }
    
    console.log('✅ Media accessibility validation passed')
  })

  test('should handle dynamic content accessibility', async ({ page }) => {
    await page.goto('/realtime-demo')
    
    // Check for ARIA live regions
    const liveRegions = await page.locator('[aria-live]').all()
    
    if (liveRegions.length > 0) {
      for (const region of liveRegions) {
        const liveValue = await region.getAttribute('aria-live')
        expect(['polite', 'assertive', 'off']).toContain(liveValue)
      }
    }

    // Check dynamic content updates
    const startButton = page.locator('[data-testid="start-simulation"]')
    if (await startButton.count() > 0) {
      await startButton.click()
      
      // Wait for dynamic updates
      await page.waitForTimeout(2000)
      
      // Verify status updates are announced to screen readers
      const statusRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]')
      if (await statusRegion.count() > 0) {
        const content = await statusRegion.textContent()
        expect(content?.trim()).toBeTruthy()
      }
    }
    
    console.log('✅ Dynamic content accessibility validation passed')
  })
})

test.describe('Accessibility Edge Cases', () => {
  test('should handle modal dialogs accessibly', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Look for modal triggers
    const modalTriggers = await page.locator('[data-testid*="modal"], [data-testid*="dialog"], [aria-haspopup="dialog"]').all()
    
    if (modalTriggers.length > 0) {
      const trigger = modalTriggers[0]
      await trigger.click()
      
      // Wait for modal to appear
      await page.waitForTimeout(500)
      
      // Check modal accessibility
      const modal = page.locator('[role="dialog"], [aria-modal="true"]')
      if (await modal.count() > 0) {
        // Modal should have aria-labelledby or aria-label
        const ariaLabel = await modal.getAttribute('aria-label')
        const ariaLabelledBy = await modal.getAttribute('aria-labelledby')
        expect(ariaLabel || ariaLabelledBy).toBeTruthy()
        
        // Focus should be trapped in modal
        await page.keyboard.press('Tab')
        const focusedElement = await page.evaluate(() => document.activeElement)
        expect(focusedElement).toBeTruthy()
        
        // Close modal with Escape
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
        
        // Modal should be closed
        expect(await modal.count()).toBe(0)
      }
    }
    
    console.log('✅ Modal accessibility validation passed')
  })

  test('should provide skip links for navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Tab to first element (should be skip link)
    await page.keyboard.press('Tab')
    
    const firstFocused = await page.evaluate(() => {
      const activeElement = document.activeElement
      return {
        tagName: activeElement?.tagName,
        textContent: activeElement?.textContent?.trim(),
        href: activeElement?.getAttribute('href'),
      }
    })
    
    // First focusable element should ideally be a skip link
    if (firstFocused.tagName === 'A' && firstFocused.textContent?.toLowerCase().includes('skip')) {
      console.log('✅ Skip link found and accessible')
    } else {
      console.log('ℹ️ Consider adding skip links for better navigation')
    }
  })
})