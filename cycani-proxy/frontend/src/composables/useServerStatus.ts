import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '@/services/api'

export interface ServerStatus {
  online: boolean
  latency: number | null
  lastCheck: Date | null
}

export function useServerStatus(checkInterval = 30000) {
  const status = ref<ServerStatus>({
    online: false,
    latency: null,
    lastCheck: null
  })

  const loading = ref(false)

  let intervalId: number | null = null

  async function checkServerStatus() {
    loading.value = true
    const startTime = Date.now()

    try {
      // 使用一个简单的API端点来检查服务器状态
      await api.get('/api/anime-list', { params: { page: 1, limit: 1 } })

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
    checkServerStatus()
    intervalId = window.setInterval(() => {
      checkServerStatus()
    }, checkInterval)
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  onMounted(() => {
    startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    status,
    loading,
    checkServerStatus,
    startPolling,
    stopPolling
  }
}
