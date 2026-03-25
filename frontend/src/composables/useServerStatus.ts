import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '@/services/api'

export interface ServerStatus {
  online: boolean
  latency: number | null
  lastCheck: Date | null
}

export function useServerStatus(checkInterval = 30000, autoStart = false) {
  const status = ref<ServerStatus>({
    online: false,
    latency: null,
    lastCheck: null
  })

  const loading = ref(false)
  const enabled = ref(autoStart)

  let intervalId: number | null = null

  async function checkServerStatus() {
    loading.value = true
    const startTime = Date.now()

    try {
      // 使用轻量级健康检查端点
      await api.get('/api/health')

      const latency = Date.now() - startTime

      status.value = {
        online: true,
        latency,
        lastCheck: new Date()
      }
    } catch (error) {
      status.value = {
        online: false,
        latency: null,
        lastCheck: new Date()
      }
    } finally {
      loading.value = false
    }
  }

  function startPolling() {
    if (intervalId) return // Already running

    enabled.value = true
    checkServerStatus()
    intervalId = window.setInterval(() => {
      checkServerStatus()
    }, checkInterval)
  }

  function stopPolling() {
    enabled.value = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function toggle() {
    if (enabled.value) {
      stopPolling()
    } else {
      startPolling()
    }
  }

  onMounted(() => {
    if (autoStart) {
      startPolling()
    }
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    status,
    loading,
    enabled,
    checkServerStatus,
    startPolling,
    stopPolling,
    toggle
  }
}
