/**
 * Cache Settings Composable
 *
 * Manages the global cache preference setting for API requests.
 * Default is disabled (false) to ensure fresh data during development.
 */

import { ref, watch } from 'vue';

const CACHE_SETTINGS_KEY = 'cycani_cache_settings';

export interface CacheSettings {
  enabled: boolean;
}

// Default to disabled for development workflow
const settings = ref<CacheSettings>({
  enabled: false
});

// Load from localStorage on initialization
const saved = localStorage.getItem(CACHE_SETTINGS_KEY);
if (saved) {
  try {
    settings.value = JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to parse cache settings:', e);
    // Keep default (disabled) if parse fails
  }
}

// Persist to localStorage on changes
watch(
  settings,
  (newSettings) => {
    localStorage.setItem(CACHE_SETTINGS_KEY, JSON.stringify(newSettings));
  },
  { deep: true }
);

/**
 * Composable for managing cache settings
 * @returns {Object} Cache settings state and helper functions
 */
export function useCacheSettings() {
  return {
    settings,
    isEnabled: () => settings.value.enabled,
    enable: () => {
      settings.value.enabled = true;
    },
    disable: () => {
      settings.value.enabled = false;
    },
    toggle: () => {
      settings.value.enabled = !settings.value.enabled;
    }
  };
}
