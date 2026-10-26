import { supabase } from '../lib/supabase'

const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim()

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)))
}

async function readyRegistration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador não oferece notificações em segundo plano.')
  }
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

export const pushNotificationsConfigured = Boolean(publicKey)

export async function subscribeToPushNotifications(userId: string) {
  if (!supabase) throw new Error('Supabase não configurado.')
  if (!publicKey) throw new Error('A chave pública de notificações ainda não foi configurada no aplicativo.')
  if (!('Notification' in window)) throw new Error('Este navegador não oferece notificações web.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('A permissão de notificações não foi concedida.')

  const registration = await readyRegistration()
  const current = await registration.pushManager.getSubscription()
  const subscription = current || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(publicKey),
  })
  const serialized = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: serialized.keys?.p256dh || null,
    auth: serialized.keys?.auth || null,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })
  if (error) throw error
  return subscription
}

export async function unsubscribeFromPushNotifications() {
  if (!supabase || !('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/sw.js') || await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}
