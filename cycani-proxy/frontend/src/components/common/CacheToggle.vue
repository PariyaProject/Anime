<template>
  <div class="cache-toggle">
    <label class="toggle-label">
      <input
        type="checkbox"
        :checked="settings.enabled"
        @change="toggle"
        class="toggle-checkbox"
      />
      <span class="toggle-text">启用缓存</span>
    </label>
    <small v-if="settings.enabled" class="text-warning">
      <span class="warning-icon">⚠️</span>
      缓存已启用 - 数据可能不是最新的
    </small>
  </div>
</template>

<script setup lang="ts">
import { useCacheSettings } from '@/composables/useCacheSettings';

const { settings, toggle } = useCacheSettings();
</script>

<style scoped>
.cache-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--el-color-primary, #409eff);
}

.toggle-text {
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
}

.text-warning {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--el-color-warning, #e6a23c);
  font-size: 12px;
  margin-left: 1.5rem;
}

.warning-icon {
  font-size: 14px;
}
</style>
