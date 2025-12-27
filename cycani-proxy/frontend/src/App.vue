<template>
  <div id="app" :class="{ 'dark-mode': uiStore.darkMode }">
    <AppNavbar />
    <main class="main-content">
      <AppContainer>
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </AppContainer>
    </main>

    <!-- Notifications -->
    <div class="notifications-container">
      <TransitionGroup name="list">
        <div
          v-for="notification in uiStore.notifications"
          :key="notification.id"
          class="notification"
          :class="`notification-${notification.type}`"
        >
          <div class="d-flex align-items-center gap-2">
            <i :class="getNotificationIcon(notification.type)"></i>
            <span>{{ notification.message }}</span>
            <button
              type="button"
              class="btn-close btn-close-white ms-auto"
              @click="uiStore.removeNotification(notification.id)"
            ></button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppContainer from '@/components/layout/AppContainer.vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    success: 'bi bi-check-circle-fill',
    error: 'bi bi-x-circle-fill',
    warning: 'bi bi-exclamation-triangle-fill',
    info: 'bi bi-info-circle-fill'
  }
  return icons[type] || icons.info
}

onMounted(() => {
  uiStore.loadDarkModePreference()
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

.notifications-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.notification {
  pointer-events: auto;
  min-width: 300px;
  max-width: 400px;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification-success {
  background-color: #198754;
}

.notification-error {
  background-color: #dc3545;
}

.notification-warning {
  background-color: #ffc107;
  color: #000;
}

.notification-info {
  background-color: #0dcaf0;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
