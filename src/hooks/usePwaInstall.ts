import { useEffect, useMemo, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  const isIos = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
  }, [])

  useEffect(() => {
    const refreshInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      setInstalled(standalone)
    }
    refreshInstalled()

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener?.('change', refreshInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      media.removeEventListener?.('change', refreshInstalled)
    }
  }, [])

  const install = async () => {
    if (!promptEvent) return 'unavailable' as const
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setPromptEvent(null)
      return 'accepted' as const
    }
    return 'dismissed' as const
  }

  return {
    installed,
    isIos,
    canPromptInstall: Boolean(promptEvent) && !installed,
    install,
  }
}
