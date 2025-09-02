// PWA Install Manager
// Handles PWA installation prompts and app install state

export interface InstallState {
  canInstall: boolean
  isInstalled: boolean
  isStandalone: boolean
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
  deferredPrompt: any | null
}

export class PWAInstallManager {
  private state: InstallState = {
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    platform: 'unknown',
    deferredPrompt: null
  }

  private listeners: ((state: InstallState) => void)[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.detectPlatform()
      this.detectStandaloneMode()
      this.initializeInstallPrompt()
      this.checkInstallState()
    }
  }

  private detectPlatform() {
    const userAgent = window.navigator.userAgent.toLowerCase()
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      this.state.platform = 'ios'
    } else if (/android/.test(userAgent)) {
      this.state.platform = 'android'
    } else {
      this.state.platform = 'desktop'
    }
  }

  private detectStandaloneMode() {
    // Check if app is running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')

    this.state.isStandalone = isStandalone
    this.state.isInstalled = isStandalone
  }

  private initializeInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the default prompt
      e.preventDefault()
      
      // Store the event for later use
      this.state.deferredPrompt = e
      this.state.canInstall = true
      
      // Notify listeners
      this.notifyListeners()
    })

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.state.isInstalled = true
      this.state.canInstall = false
      this.state.deferredPrompt = null
      
      // Track installation
      this.trackInstallation()
      
      // Notify listeners
      this.notifyListeners()
    })
  }

  private checkInstallState() {
    // Check if app is already installed
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps.length > 0) {
          this.state.isInstalled = true
          this.notifyListeners()
        }
      })
    }
  }

  async promptInstall(): Promise<boolean> {
    if (!this.state.canInstall || !this.state.deferredPrompt) {
      return false
    }

    try {
      // Show the install prompt
      this.state.deferredPrompt.prompt()
      
      // Wait for the user's response
      const { outcome } = await this.state.deferredPrompt.userChoice
      
      // Reset the deferred prompt
      this.state.deferredPrompt = null
      this.state.canInstall = false
      
      // Track the outcome
      this.trackInstallChoice(outcome)
      
      return outcome === 'accepted'
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }

  getInstallInstructions(): string {
    switch (this.state.platform) {
      case 'ios':
        return 'Tap the share button and select "Add to Home Screen"'
      case 'android':
        return 'Tap the menu button and select "Install App"'
      case 'desktop':
        return 'Click the install button in the address bar'
      default:
        return 'Look for the install option in your browser menu'
    }
  }

  subscribe(listener: (state: InstallState) => void): () => void {
    this.listeners.push(listener)
    
    // Immediately notify with current state
    listener(this.getState())
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  getState(): InstallState {
    return { ...this.state }
  }

  private trackInstallation() {
    // Track installation analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'pwa_installed', {
        platform: this.state.platform
      })
    }
  }

  private trackInstallChoice(outcome: string) {
    // Track install choice analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'pwa_install_choice', {
        outcome,
        platform: this.state.platform
      })
    }
  }

  // Check if the app should show install promotion
  shouldShowInstallPromotion(): boolean {
    // Don't show if already installed or in standalone mode
    if (this.state.isInstalled || this.state.isStandalone) {
      return false
    }

    // Check if user has dismissed the prompt recently
    const dismissedTime = localStorage.getItem('pwa_install_dismissed')
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) {
        return false
      }
    }

    // Check if user has used the app enough times
    const visitCount = parseInt(localStorage.getItem('pwa_visit_count') || '0')
    localStorage.setItem('pwa_visit_count', (visitCount + 1).toString())
    
    return visitCount >= 3
  }

  dismissInstallPromotion() {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString())
  }
}

// Export singleton instance
export const installManager = new PWAInstallManager()