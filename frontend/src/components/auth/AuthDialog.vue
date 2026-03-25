<template>
  <ModalDialog
    v-model="open"
    :title="isRegisterMode ? '创建账号' : '账号登录'"
    size="sm"
    @close="resetForm"
  >
    <form class="auth-form" @submit.prevent="submit">
      <div class="form-field">
        <label for="auth-username">用户名</label>
        <input
          id="auth-username"
          v-model.trim="username"
          type="text"
          autocomplete="username"
          placeholder="3-24 位用户名"
          required
        />
      </div>

      <div class="form-field">
        <label for="auth-password">密码</label>
        <input
          id="auth-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="至少 8 位"
          required
        />
      </div>

      <div v-if="isRegisterMode" class="form-field">
        <label for="auth-password-confirm">确认密码</label>
        <input
          id="auth-password-confirm"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="再次输入密码"
          required
        />
      </div>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <div class="form-actions">
        <button type="submit" class="submit-btn" :disabled="authStore.loading">
          {{ authStore.loading ? '处理中...' : (isRegisterMode ? '注册并登录' : '登录') }}
        </button>
      </div>
    </form>

    <template #footer>
      <button type="button" class="switch-btn" @click="toggleMode">
        {{ isRegisterMode ? '已有账号？去登录' : '没有账号？去注册' }}
      </button>
    </template>
  </ModalDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ModalDialog from '@/components/common/ModalDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{
  modelValue: boolean
  initialMode?: 'login' | 'register'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const authStore = useAuthStore()
const uiStore = useUiStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const mode = ref<'login' | 'register'>(props.initialMode || 'login')
const errorMessage = ref('')

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const isRegisterMode = computed(() => mode.value === 'register')

function resetForm() {
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  errorMessage.value = ''
  mode.value = props.initialMode || 'login'
}

function toggleMode() {
  mode.value = isRegisterMode.value ? 'login' : 'register'
  errorMessage.value = ''
  confirmPassword.value = ''
}

async function submit() {
  errorMessage.value = ''

  if (isRegisterMode.value && password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  try {
    if (isRegisterMode.value) {
      await authStore.register({
        username: username.value,
        password: password.value
      })
      uiStore.showNotification('账号已创建并登录', 'success')
    } else {
      await authStore.login({
        username: username.value,
        password: password.value
      })
      uiStore.showNotification('登录成功', 'success')
    }

    emit('success')
    open.value = false
    resetForm()
  } catch (err: any) {
    errorMessage.value = err.message || (isRegisterMode.value ? '注册失败' : '登录失败')
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.form-field input {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.7rem 0.8rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.form-field input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 18%, transparent);
}

.form-error {
  margin: 0;
  color: #d64545;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
}

.submit-btn,
.switch-btn {
  width: 100%;
  border: 0;
  border-radius: 0.6rem;
  padding: 0.75rem 0.9rem;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.submit-btn {
  background: var(--accent-color);
  color: white;
  font-weight: 600;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.switch-btn {
  background: transparent;
  color: var(--text-secondary);
}

.submit-btn:hover:not(:disabled),
.switch-btn:hover {
  transform: translateY(-1px);
}
</style>
