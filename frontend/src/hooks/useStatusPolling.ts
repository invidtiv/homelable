import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'

interface StatusMessage {
  type?: string
  node_id?: string
  status?: 'online' | 'offline' | 'pending' | 'unknown'
  checked_at?: string
  response_time_ms?: number | null
  run_id?: string
  devices_found?: number
}

export function useStatusPolling() {
  const wsRef = useRef<WebSocket | null>(null)
  const { updateNode, notifyScanDeviceFound } = useCanvasStore()
  const { isAuthenticated, token } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !token) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    const url = `${protocol}://${host}:8000/api/v1/status/ws/status?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg: StatusMessage = JSON.parse(event.data)
        if (msg.type === 'scan_device_found') {
          notifyScanDeviceFound()
        } else if (msg.node_id && msg.status) {
          updateNode(msg.node_id, {
            status: msg.status,
            response_time_ms: msg.response_time_ms ?? undefined,
            last_seen: msg.status === 'online' ? msg.checked_at : undefined,
          })
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      // silently ignore — backend may not be running in dev
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [isAuthenticated, token, updateNode, notifyScanDeviceFound])
}
