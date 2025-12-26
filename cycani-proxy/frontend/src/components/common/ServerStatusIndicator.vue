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
    <div class="status-icon">
      <i v-if="loading" class="bi bi-arrow-repeat spin"></i>
      <i v-else-if="status.online" class="bi bi-wifi"></i>
      <i v-else class="bi bi-wifi-off"></i>
    </div>
    <div class="status-text">
      <span class="status-label">{{ statusText }}</span>
      <span v-if="status.latency && status.online" class="status-latency">{{ status.latency }}ms</span>
      <span v-if="!enabled" class="status-disabled">(已禁用)</span>
    </div>
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
  if (loading.value) return '检查中...';
  if (status.value.online) return '服务器在线';
  return '服务器离线';
});

const titleText = computed(() => {
  if (!enabled.value) {
    return '点击启用服务器状态检查';
  }
  if (loading.value) {
    return '正在检查服务器状态...';
  }
  if (status.value.online && status.value.latency) {
    return `服务器在线 - 延迟: ${status.value.latency}ms\n点击禁用状态检查`;
  }
  if (status.value.online) {
    return '服务器在线\n点击禁用状态检查';
  }
  return '服务器离线\n点击重试';
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
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  background-color: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color, #dcdfe6);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  min-width: 140px;
}

.server-status-indicator:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.server-status-indicator:focus-visible {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: 2px;
}

.server-status-indicator.online {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.server-status-indicator.offline {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.server-status-indicator.loading {
  border-color: #e6a23c;
  background-color: #fdf6ec;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.server-status-indicator.online .status-icon {
  color: #67c23a;
}

.server-status-indicator.offline .status-icon {
  color: #f56c6c;
}

.server-status-indicator.loading .status-icon {
  color: #e6a23c;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.status-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
}

.status-latency {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.status-disabled {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  font-style: italic;
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
  .server-status-indicator {
    min-width: auto;
    padding: 0.25rem 0.5rem;
  }

  .status-text {
    display: none;
  }

  .status-icon {
    width: 24px;
    height: 24px;
  }
}
</style>
