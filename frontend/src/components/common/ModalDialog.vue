<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-backdrop"
        @click="onBackdropClick"
        role="dialog"
        :aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div
          class="modal-dialog"
          :class="[`modal-${size}`, { 'modal-centered': centered }]"
          @click.stop
        >
          <div class="modal-content">
            <!-- Header -->
            <div v-if="title || $slots.header" class="modal-header">
              <h5 v-if="title" :id="titleId" class="modal-title">{{ title }}</h5>
              <slot name="header"></slot>
              <button
                v-if="closable"
                type="button"
                class="btn-close"
                :aria-label="closeLabel"
                @click="close"
              ></button>
            </div>

            <!-- Body -->
            <div class="modal-body">
              <slot></slot>
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface ModalProps {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  centered?: boolean
  closable?: boolean
  closeOnBackdrop?: boolean
  closeLabel?: string
}

const props = withDefaults(defineProps<ModalProps>(), {
  size: 'md',
  centered: true,
  closable: true,
  closeOnBackdrop: true,
  closeLabel: 'Close'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'open': []
  'close': []
}>()

const titleId = computed(() => `modal-title-${Math.random().toString(36).substr(2, 9)}`)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdropClick() {
  if (props.closeOnBackdrop) {
    close()
  }
}

// Emit open event when modal opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    emit('open')
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}, { immediate: true })
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.modal-dialog {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  max-width: 100%;
  width: 100%;
  max-height: calc(100vh - 2rem);
  overflow: auto;
}

.modal-sm {
  max-width: 300px;
}

.modal-md {
  max-width: 500px;
}

.modal-lg {
  max-width: 800px;
}

.modal-xl {
  max-width: 1140px;
}

.modal-centered {
  margin: auto;
}

.modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
}

.modal-header .modal-title {
  margin: 0;
  font-size: 1.25rem;
}

.modal-body {
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Dark mode */
.dark .modal-dialog {
  background: #1a1a1a;
}

.dark .modal-header,
.dark .modal-footer {
  border-color: #333;
}

/* Transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-dialog,
.modal-leave-active .modal-dialog {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-dialog,
.modal-leave-to .modal-dialog {
  transform: scale(0.9);
  opacity: 0;
}

.modal-enter-to .modal-dialog,
.modal-leave-from .modal-dialog {
  transform: scale(1);
  opacity: 1;
}
</style>
