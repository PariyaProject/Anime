import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/styles/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// Enable Pinia devtools
pinia.use(({ store }) => {
  if (import.meta.env.DEV) {
    // Add store to window for debugging in development
    ;(window as any).__PINIA_STORES__ = (window as any).__PINIA_STORES__ || {}
    ;(window as any).__PINIA_STORES__[store.$id] = store
  }
})

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')
