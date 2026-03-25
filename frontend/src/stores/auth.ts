import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import { adminService } from '@/services/admin.service'
import { useHistoryStore } from '@/stores/history'
import type { AuthCredentials, AuthUser, PublicSiteBootstrap } from '@/types/auth.types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const publicBootstrap = ref<PublicSiteBootstrap | null>(null)
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)
  let initPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => Boolean(user.value))

  async function refreshHistoryAfterAuth() {
    const historyStore = useHistoryStore()
    await historyStore.syncLocalPositionsToBackend()
    await Promise.allSettled([
      historyStore.loadWatchHistory(),
      historyStore.loadContinueWatching()
    ])
  }

  async function ensurePublicBootstrap() {
    if (publicBootstrap.value) {
      return publicBootstrap.value
    }

    publicBootstrap.value = await adminService.getPublicBootstrap()
    return publicBootstrap.value
  }

  async function refreshPublicBootstrap() {
    publicBootstrap.value = await adminService.getPublicBootstrap()
    return publicBootstrap.value
  }

  function applyPublicBootstrap(bootstrap: PublicSiteBootstrap) {
    publicBootstrap.value = {
      ...(publicBootstrap.value || {}),
      ...bootstrap
    }
  }

  async function initialize() {
    if (initialized.value) {
      return
    }
    if (initPromise) {
      return initPromise
    }

    initPromise = (async () => {
      loading.value = true
      error.value = null

      try {
        const [currentUser, bootstrap] = await Promise.all([
          authService.getCurrentUser(),
          adminService.getPublicBootstrap()
        ])
        user.value = currentUser
        publicBootstrap.value = bootstrap
        if (user.value) {
          await refreshHistoryAfterAuth()
        }
      } catch (err: any) {
        error.value = err.message || 'Failed to restore session'
        user.value = null
      } finally {
        loading.value = false
        initialized.value = true
        initPromise = null
      }
    })()

    return initPromise
  }

  async function login(credentials: AuthCredentials) {
    loading.value = true
    error.value = null

    try {
      user.value = await authService.login(credentials)
      await refreshHistoryAfterAuth()
      return user.value
    } catch (err: any) {
      error.value = err.message || 'Failed to login'
      throw err
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function register(credentials: AuthCredentials) {
    loading.value = true
    error.value = null

    try {
      throw new Error('站点当前仅支持管理员邀请注册')
    } catch (err: any) {
      error.value = err.message || 'Failed to register'
      throw err
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function acceptInvite(inviteCode: string, credentials: AuthCredentials) {
    loading.value = true
    error.value = null

    try {
      user.value = await authService.acceptInvite(inviteCode, credentials)
      await refreshHistoryAfterAuth()
      return user.value
    } catch (err: any) {
      error.value = err.message || 'Failed to accept invite'
      throw err
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function logout() {
    loading.value = true
    error.value = null

    try {
      await authService.logout()
      user.value = null
      useHistoryStore().resetState()
    } catch (err: any) {
      error.value = err.message || 'Failed to logout'
      throw err
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  return {
    user,
    publicBootstrap,
    loading,
    initialized,
    error,
    isAuthenticated,
    ensurePublicBootstrap,
    refreshPublicBootstrap,
    applyPublicBootstrap,
    initialize,
    login,
    register,
    acceptInvite,
    logout
  }
})
