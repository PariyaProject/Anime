import { ref, readonly, onMounted } from 'vue'

export function useDarkMode() {
  const darkMode = ref(false)

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    updateDocumentClass()
    savePreference()
  }

  function setDarkMode(value: boolean) {
    darkMode.value = value
    updateDocumentClass()
    savePreference()
  }

  function updateDocumentClass() {
    if (darkMode.value) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  function savePreference() {
    localStorage.setItem('darkMode', darkMode.value ? 'enabled' : 'disabled')
  }

  function loadPreference() {
    const saved = localStorage.getItem('darkMode')
    if (saved === 'enabled') {
      darkMode.value = true
    } else if (saved === 'disabled') {
      darkMode.value = false
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      darkMode.value = true
    }
    updateDocumentClass()
  }

  onMounted(() => {
    loadPreference()
  })

  return {
    darkMode: readonly(darkMode),
    toggleDarkMode,
    setDarkMode
  }
}
