<template>
  <div class="empty-state">
    <div class="empty-icon">
      <i :class="icon"></i>
    </div>
    <h5 class="empty-title">{{ title }}</h5>
    <p class="empty-description">{{ description }}</p>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  title: string
  description: string
}

withDefaults(defineProps<Props>(), {
  icon: 'bi bi-inbox'
})
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 1rem;
  color: #adb5bd;
}
</style>
