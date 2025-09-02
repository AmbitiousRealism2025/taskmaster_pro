// React Hook for PWA Installation
// Provides install state and methods to React components

import { useState, useEffect } from 'react'
import { installManager, InstallState } from '@/lib/pwa/install-manager'

export function usePWAInstall() {
  const [installState, setInstallState] = useState<InstallState>({
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    platform: 'unknown',
    deferredPrompt: null
  })

  const [showPromotion, setShowPromotion] = useState(false)

  useEffect(() => {
    // Subscribe to install state changes
    const unsubscribe = installManager.subscribe((state) => {
      setInstallState(state)
    })

    // Check if we should show install promotion
    setShowPromotion(installManager.shouldShowInstallPromotion())

    return unsubscribe
  }, [])

  const promptInstall = async () => {
    const success = await installManager.promptInstall()
    if (success) {
      setShowPromotion(false)
    }
    return success
  }

  const dismissPromotion = () => {
    installManager.dismissInstallPromotion()
    setShowPromotion(false)
  }

  const getInstallInstructions = () => {
    return installManager.getInstallInstructions()
  }

  return {
    ...installState,
    showPromotion,
    promptInstall,
    dismissPromotion,
    getInstallInstructions
  }
}