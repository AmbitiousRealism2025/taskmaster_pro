'use client'

import { usePWAInstall } from '@/hooks/use-pwa-install'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Download, Smartphone, Monitor } from 'lucide-react'

export function InstallPrompt() {
  const {
    canInstall,
    isInstalled,
    isStandalone,
    platform,
    showPromotion,
    promptInstall,
    dismissPromotion,
    getInstallInstructions
  } = usePWAInstall()

  // Don't show if already installed or not promotable
  if (isInstalled || isStandalone || !showPromotion) {
    return null
  }

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall()
    }
  }

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-sm p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getPlatformIcon()}
            <h3 className="font-semibold">Install TaskMaster Pro</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Install our app for offline access, faster loading, and a native experience.
          </p>
          
          {canInstall ? (
            <div className="flex gap-2">
              <Button 
                onClick={handleInstall}
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Install App
              </Button>
              <Button
                onClick={dismissPromotion}
                size="sm"
                variant="outline"
              >
                Not Now
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {getInstallInstructions()}
              </p>
              <Button
                onClick={dismissPromotion}
                size="sm"
                variant="outline"
              >
                Got it
              </Button>
            </div>
          )}
        </div>
        <button
          onClick={dismissPromotion}
          className="ml-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  )
}