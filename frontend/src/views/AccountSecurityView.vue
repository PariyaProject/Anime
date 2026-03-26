<template>
  <section class="account-security" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <div class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">Account Security</p>
        <h1>修改密码</h1>
        <p>
          当前账号：<strong>{{ authStore.user?.username || '未知用户' }}</strong>
          。修改后，其他设备上的登录会自动失效，当前设备会继续保持登录。
        </p>
      </div>
      <div class="signal-stack" aria-hidden="true">
        <span>SESSION</span>
        <span>VERIFY</span>
        <span>ROTATE</span>
      </div>
    </div>

    <form class="password-card" @submit.prevent="submitPasswordChange">
      <div class="card-header">
        <div>
          <p class="eyebrow">Credentials</p>
          <h2>更新登录凭据</h2>
        </div>
        <span class="security-badge">仅当前账号可修改</span>
      </div>

      <label class="field">
        <span>当前密码</span>
        <input
          v-model="form.currentPassword"
          type="password"
          autocomplete="current-password"
          placeholder="请输入当前密码"
          required
        />
      </label>

      <label class="field">
        <span>新密码</span>
        <input
          v-model="form.nextPassword"
          type="password"
          autocomplete="new-password"
          placeholder="至少 8 位"
          required
        />
      </label>

      <label class="field">
        <span>确认新密码</span>
        <input
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="再次输入新密码"
          required
        />
      </label>

      <p class="hint">
        为了避免误操作，管理员在后台不能直接重置当前登录账号自己的密码；当前账号请统一在这里修改。
      </p>

      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? '保存中...' : '保存新密码' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const uiStore = useUiStore()
const isDarkMode = computed(() => uiStore.darkMode)

const submitting = ref(false)
const confirmPassword = ref('')
const form = reactive({
  currentPassword: '',
  nextPassword: ''
})

function resetForm() {
  form.currentPassword = ''
  form.nextPassword = ''
  confirmPassword.value = ''
}

async function submitPasswordChange() {
  if (form.nextPassword !== confirmPassword.value) {
    uiStore.showNotification('两次输入的新密码不一致', 'error')
    return
  }

  submitting.value = true

  try {
    await authService.changePassword({
      currentPassword: form.currentPassword,
      nextPassword: form.nextPassword
    })
    resetForm()
    uiStore.showNotification('密码已更新', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '修改密码失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.account-security {
  --security-panel-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 251, 0.96));
  --security-hero-bg:
    radial-gradient(circle at top right, rgba(217, 168, 106, 0.18), transparent 36%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(240, 244, 248, 0.98));
  --security-card-bg: rgba(255, 255, 255, 0.82);
  --security-border: rgba(44, 62, 80, 0.1);
  --security-border-strong: rgba(44, 62, 80, 0.12);
  --security-text: #15202b;
  --security-heading: #0f1720;
  --security-muted: #546170;
  --security-kicker: #8b5e34;
  --security-input-bg: rgba(255, 255, 255, 0.96);
  --security-shadow: 0 18px 44px rgba(15, 23, 32, 0.08);
  --security-focus: rgba(202, 124, 45, 0.16);
  --security-focus-border: rgba(202, 124, 45, 0.52);
  --security-accent-start: #cf7c2e;
  --security-accent-end: #a6571f;
  --security-accent-shadow: rgba(176, 96, 37, 0.24);
  --security-hint-bg: rgba(190, 121, 53, 0.1);
  --security-hint-text: #6e4a27;
  width: min(100%, 760px);
  margin: 0 auto;
  display: grid;
  gap: 1.25rem;
  padding: 1rem 0 2rem;
  color: var(--security-text);
}

.hero-card,
.password-card {
  border-radius: 24px;
  border: 1px solid var(--security-border);
  box-shadow: var(--security-shadow);
}

.account-security.theme-light {
  color: var(--security-text);
}

.account-security.theme-dark {
  --security-panel-bg: linear-gradient(180deg, rgba(34, 39, 49, 0.96), rgba(24, 28, 36, 0.98));
  --security-hero-bg:
    radial-gradient(circle at top right, rgba(219, 155, 78, 0.16), transparent 38%),
    linear-gradient(145deg, rgba(36, 42, 53, 0.98), rgba(24, 29, 38, 0.98));
  --security-card-bg: rgba(255, 255, 255, 0.04);
  --security-border: rgba(255, 255, 255, 0.08);
  --security-border-strong: rgba(255, 255, 255, 0.1);
  --security-text: #f4eee5;
  --security-heading: #fff7ef;
  --security-muted: #cab9a5;
  --security-kicker: #d8af7c;
  --security-input-bg: rgba(255, 255, 255, 0.06);
  --security-shadow: 0 22px 58px rgba(0, 0, 0, 0.34);
  --security-focus: rgba(221, 143, 54, 0.18);
  --security-focus-border: rgba(237, 171, 89, 0.42);
  --security-accent-start: #d7924f;
  --security-accent-end: #b66a2d;
  --security-accent-shadow: rgba(221, 143, 54, 0.2);
  --security-hint-bg: rgba(216, 175, 124, 0.12);
  --security-hint-text: #f0d7b5;
}

.hero-card {
  padding: 1.5rem;
  background: var(--security-hero-bg);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.hero-card h1 {
  margin: 0.35rem 0 0.75rem;
  font-size: clamp(1.9rem, 4vw, 2.5rem);
  color: var(--security-heading);
}

.hero-card p {
  margin: 0;
  color: var(--security-muted);
  line-height: 1.7;
}

.eyebrow {
  margin: 0;
  color: var(--security-kicker);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  font-weight: 700;
}

.signal-stack {
  display: grid;
  gap: 0.55rem;
  justify-items: end;
}

.signal-stack span,
.security-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  border-radius: 999px;
  border: 1px solid var(--security-border-strong);
  background: var(--security-card-bg);
  color: var(--security-heading);
  padding: 0.35rem 0.8rem;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.password-card {
  padding: 1.5rem;
  display: grid;
  gap: 1rem;
  background: var(--security-panel-bg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.card-header h2 {
  margin: 0.35rem 0 0;
  color: var(--security-heading);
  font-size: clamp(1.2rem, 2vw, 1.5rem);
}

.field {
  display: grid;
  gap: 0.45rem;
}

.field span {
  color: var(--security-heading);
  font-weight: 600;
}

.field input {
  width: 100%;
  border: 1px solid var(--security-border-strong);
  border-radius: 16px;
  padding: 0.9rem 1rem;
  background: var(--security-input-bg);
  color: var(--security-text);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input::placeholder {
  color: var(--security-muted);
}

.field input:focus {
  border-color: var(--security-focus-border);
  box-shadow: 0 0 0 4px var(--security-focus);
}

.hint {
  margin: 0;
  border-radius: 16px;
  padding: 0.85rem 1rem;
  background: var(--security-hint-bg);
  color: var(--security-hint-text);
  line-height: 1.6;
}

.primary-button {
  width: fit-content;
  min-width: 160px;
  border: none;
  border-radius: 999px;
  padding: 0.9rem 1.4rem;
  background: linear-gradient(135deg, var(--security-accent-start), var(--security-accent-end));
  color: #fff9f2;
  font-weight: 700;
  box-shadow: 0 14px 28px var(--security-accent-shadow);
}

.primary-button:disabled {
  opacity: 0.72;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 640px) {
  .hero-card,
  .password-card {
    border-radius: 20px;
    padding: 1.15rem;
  }

  .hero-card,
  .card-header {
    flex-direction: column;
  }

  .signal-stack {
    justify-items: start;
  }

  .primary-button {
    width: 100%;
  }
}
</style>
