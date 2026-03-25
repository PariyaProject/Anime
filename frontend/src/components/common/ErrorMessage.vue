<template>
  <div class="error-message" role="alert" aria-live="assertive">
    <div class="alert alert-danger">
      <i class="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
      <span>{{ message }}</span>
    </div>
    <button
      v-if="showRetry"
      class="btn btn-outline-danger btn-sm mt-2"
      @click="$emit('retry')"
      :aria-label="`重试: ${message}`"
    >
      重试
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string
  showRetry?: boolean
}

withDefaults(defineProps<Props>(), {
  showRetry: false
})

defineEmits<{
  retry: []
}>()
</script>

<style scoped>
.error-message {
  text-align: center;
  padding: 2rem;
}
</style>
