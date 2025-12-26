import { ref, computed } from 'vue'

const AUToplay_STORAGE_KEY = 'anime-autoplay-preference'
const DEFAULT_AUTOPLAY = true

/**
 * Composable for managing autoplay preference.
 * Persists user's autoplay choice to localStorage.
 */
export function useAutoplay() {
  const autoplay = ref(DEFAULT_AUTOPLAY)

  /**
   * Load autoplay preference from localStorage
   */
  function loadPreference() {
    try {
      const stored = localStorage.getItem(AUToplay_STORAGE_KEY)
      if (stored !== null) {
        autoplay.value = stored === 'true'
      }
    } catch (err) {
      console.warn('Failed to load autoplay preference:', err)
      autoplay.value = DEFAULT_AUTOPLAY
    }
  }

  /**
   * Save current autoplay preference to localStorage
   */
  function savePreference() {
    try {
      localStorage.setItem(AUToplay_STORAGE_KEY, String(autoplay.value))
    } catch (err) {
      console.warn('Failed to save autoplay preference:', err)
    }
  }

  /**
   * Toggle autoplay state and persist
   */
  function toggleAutoplay() {
    autoplay.value = !autoplay.value
    savePreference()
  }

  /**
   * Set autoplay to a specific value and persist
   */
  function setAutoplay(value: boolean) {
    autoplay.value = value
    savePreference()
  }

  // Load preference on initialization
  loadPreference()

  return {
    autoplay: computed(() => autoplay.value),
    toggleAutoplay,
    setAutoplay,
    loadPreference,
    savePreference
  }
}
