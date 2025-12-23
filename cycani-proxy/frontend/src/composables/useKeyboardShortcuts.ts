import { onMounted, onUnmounted } from 'vue'

export type KeyboardShortcutHandler = () => void

export interface KeyboardShortcuts {
  [key: string]: KeyboardShortcutHandler
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  function handleKeydown(event: KeyboardEvent) {
    const key = event.code
    const ctrl = event.ctrlKey || event.metaKey

    // Don't trigger when typing in input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement).isContentEditable
    ) {
      return
    }

    const shortcutKey = ctrl ? `Ctrl+${key}` : key

    if (shortcutKey in shortcuts) {
      event.preventDefault()
      shortcuts[shortcutKey]()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    handleKeydown
  }
}
