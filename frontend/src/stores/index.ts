import { createPinia } from 'pinia'

export const pinia = createPinia()

pinia.use(({ store }) => {
  if (import.meta.env.DEV) {
    ;(window as any).__PINIA_STORES__ = (window as any).__PINIA_STORES__ || {}
    ;(window as any).__PINIA_STORES__[store.$id] = store
  }
})
