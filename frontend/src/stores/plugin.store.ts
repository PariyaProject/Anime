import { defineStore } from 'pinia'
import { api } from '@/services/api'
import { ref } from 'vue'

export interface PluginManifest {
  id: string
  name: string
  version: string
  icon: string
  description: string
  lang: string
  capabilities: {
    browse: boolean
    search: boolean
    weeklySchedule: boolean
    animeDetail: boolean
    multiQuality: boolean
  }
  uiLayout?: {
    home?: Array<{ component: string; props?: Record<string, any> }>
    detail?: Array<{ component: string; props?: Record<string, any> }>
  }
}

export const usePluginStore = defineStore('plugin', () => {
  const plugins = ref<PluginManifest[]>([])
  const activeSourceId = ref<string>(localStorage.getItem('active_source') || 'cycani')
  const isLoading = ref<boolean>(false)

  const fetchPlugins = async () => {
    isLoading.value = true
    try {
      const response = await api.get('/api/plugins')
      if (response.data?.success && response.data.data && Array.isArray(response.data.data.plugins)) {
        plugins.value = response.data.data.plugins
        
        // Validate activeSourceId still exists
        if (plugins.value.length > 0 && !plugins.value.find(p => p.id === activeSourceId.value)) {
          setActiveSource(plugins.value[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error)
    } finally {
      isLoading.value = false
    }
  }

  const setActiveSource = (id: string) => {
    activeSourceId.value = id
    localStorage.setItem('active_source', id)
  }

  const getActivePlugin = () => {
    return plugins.value.find(p => p.id === activeSourceId.value) || null
  }

  return {
    plugins,
    activeSourceId,
    isLoading,
    fetchPlugins,
    setActiveSource,
    getActivePlugin
  }
})
