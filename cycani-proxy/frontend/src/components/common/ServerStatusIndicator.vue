<template>
  <div
    class="server-status-indicator"
    :class="statusClass"
    @click="toggleStatusCheck"
    :title="titleText"
    :aria-label="ariaLabel"
    role="button"
    tabindex="0"
    @keydown.enter="toggleStatusCheck"
    @keydown.space.prevent="toggleStatusCheck"
  >
    <span class="status-icon">
      <i v-if="loading" class="bi bi-arrow-repeat spin"></i>
      <i v-else-if="status.online" class="bi bi-wifi"></i>
      <i v-else class="bi bi-wifi-off"></i>
    </span>
    <span class="status-text">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useServerStatus } from '@/composables/useServerStatus';

const serverStatus = useServerStatus(30000, false); // 默认禁用自动检查

const { status, loading, enabled, toggle } = serverStatus;

const statusClass = computed(() => {
  if (loading.value) return 'loading';
  if (status.value.online) return 'online';
  return 'offline';
});

const statusText = computed(() => {
  if (loading.value) return '检查中';
  if (!enabled.value) return '已禁用';
  if (status.value.online) return status.value.latency ? `${status.value.latency}ms` : '在线';
  return '离线';
});

const titleText = computed(() => {
  if (!enabled.value) {
    return '点击启用服务器状态检查';
  }
  if (loading.value) {
    return '正在检查...';
  }
  if (status.value.online && status.value.latency) {
    return `服务器在线 (${status.value.latency}ms) - 点击禁用`;
  }
  if (status.value.online) {
    return '服务器在线 - 点击禁用';
  }
  return '服务器离线 - 点击重试';
});

const ariaLabel = computed(() => {
  if (!enabled.value) return '服务器状态检查已禁用，点击启用';
  if (loading.value) return '正在检查服务器状态';
  if (status.value.online) return '服务器在线，点击禁用状态检查';
  return '服务器离线，点击重试';
});

function toggleStatusCheck() {
  toggle();
}
</script>

<style scoped>
.server-status-indicator {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  white-space: nowrap;
  height: 28px;
}

.server-status-indicator:hover {
  background-color: var(--bg-tertiary);
}

.server-status-indicator:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.server-status-indicator.online {
  border-color: #67c23a;
  color: #67c23a;
}

.server-status-indicator.offline {
  border-color: #f56c6c;
  color: #f56c6c;
}

.server-status-indicator.loading {
  border-color: #e6a23c;
  color: #e6a23c;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 0.75rem;
}

.status-text {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .status-text {
    display: none;
  }

  .status-icon {
    width: 18px;
    height: 18px;
  }
}
</style>
