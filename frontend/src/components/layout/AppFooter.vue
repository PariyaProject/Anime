<template>
  <footer class="app-footer py-4 mt-auto">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-6 text-center text-md-start">
          <p class="mb-0 text-muted">
            &copy; {{ currentYear }} 动画网站
            <span class="mx-2">•</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-muted">
              GitHub
            </a>
          </p>
        </div>
        <div class="col-md-6 text-center text-md-end">
          <p class="mb-0 text-muted small">
            Made with
            <span class="text-danger">♥</span>
            using Vue 3 + TypeScript
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.app-footer {
  background-color: var(--bs-light);
  border-top: 1px solid var(--bs-border-color);
}

.app-footer {
  background-color: var(--bs-light);
  border-top: 1px solid var(--bs-border-color);
}

.dark .app-footer {
  background-color: #1a1a1a;
  border-top-color: #333;
}

a:hover {
  color: var(--bs-primary) !important;
}
</style>
