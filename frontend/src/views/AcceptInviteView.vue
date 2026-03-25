<template>
  <div class="invite-screen">
    <section class="invite-card">
      <header class="invite-header">
        <p class="eyebrow">{{ inviteInfo?.site.siteName || bootstrap?.siteName || 'ANIME' }}</p>
        <h1>创建账号</h1>
        <p>
          使用这份邀请完成账号创建后，即可进入站点。
        </p>
      </header>

      <div v-if="loadingInvite" class="loading-state">正在校验邀请码...</div>
      <div v-else-if="inviteError" class="error-box">{{ inviteError }}</div>
      <form v-else class="invite-form" @submit.prevent="submit">
        <label class="field">
          <span>用户名</span>
          <input v-model.trim="username" type="text" placeholder="创建你的登录用户名" required />
        </label>

        <label class="field">
          <span>密码</span>
          <input v-model="password" type="password" placeholder="至少 8 位" required />
        </label>

        <label class="field">
          <span>确认密码</span>
          <input v-model="confirmPassword" type="password" placeholder="再次输入密码" required />
        </label>

        <p v-if="errorMessage" class="error-box compact">{{ errorMessage }}</p>

        <p v-if="inviteInfo?.site.supportContact" class="support-line">
          支持联系：{{ inviteInfo.site.supportContact }}
        </p>

        <button class="submit-button" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? '正在创建账号...' : '创建账号并进入站点' }}
        </button>
      </form>

      <footer class="invite-footer">
        已有账号？
        <router-link to="/login">返回登录</router-link>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminService } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { InviteValidationResponse } from '@/types/auth.types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

const bootstrap = authStore.publicBootstrap
const loadingInvite = ref(true)
const inviteError = ref('')
const errorMessage = ref('')
const inviteInfo = ref<InviteValidationResponse | null>(null)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')

async function loadInvite() {
  loadingInvite.value = true
  inviteError.value = ''

  try {
    inviteInfo.value = await adminService.getInviteInfo(String(route.params.code))
  } catch (err: any) {
    inviteError.value = err.message || '邀请码不可用'
  } finally {
    loadingInvite.value = false
  }
}

async function submit() {
  errorMessage.value = ''

  if (password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  try {
    await authStore.acceptInvite(String(route.params.code), {
      username: username.value,
      password: password.value
    })
    uiStore.showNotification('账号创建成功', 'success')
    await router.push('/')
  } catch (err: any) {
    errorMessage.value = err.message || '接受邀请失败'
  }
}

onMounted(async () => {
  uiStore.loadDarkModePreference()
  await authStore.ensurePublicBootstrap()
  await loadInvite()
})
</script>

<style scoped>
.invite-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    radial-gradient(circle at top, rgba(237, 154, 46, 0.18), transparent 26%),
    linear-gradient(155deg, #11151d, #17101a 52%, #090c11);
}

.invite-card {
  width: min(100%, 34rem);
  border-radius: 1.8rem;
  padding: 2rem;
  background: rgba(11, 15, 22, 0.86);
  color: #f8f0e4;
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
}

.eyebrow {
  margin: 0 0 0.8rem;
  letter-spacing: 0.24rem;
  text-transform: uppercase;
  font-size: 0.74rem;
  color: rgba(248, 240, 228, 0.52);
}

.invite-header h1 {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
  font-size: clamp(2rem, 5vw, 3.3rem);
  line-height: 0.96;
}

.invite-header p {
  line-height: 1.7;
  color: rgba(248, 240, 228, 0.76);
}

.loading-state,
.error-box {
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  margin-top: 1.4rem;
}

.loading-state {
  background: rgba(255, 255, 255, 0.06);
}

.error-box {
  background: rgba(160, 47, 37, 0.18);
  color: #ffb2a4;
}

.error-box.compact {
  margin-top: 0;
}

.invite-form {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.support-line {
  margin: 0;
  color: rgba(248, 240, 228, 0.62);
  font-size: 0.92rem;
  line-height: 1.6;
}

.field input {
  border-radius: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: rgba(255, 255, 255, 0.04);
  color: #fff9f0;
  padding: 0.9rem 1rem;
}

.field input:focus {
  outline: none;
  border-color: rgba(241, 165, 69, 0.8);
  box-shadow: 0 0 0 4px rgba(241, 165, 69, 0.12);
}

.submit-button {
  border: 0;
  border-radius: 999px;
  padding: 0.95rem 1.1rem;
  background: linear-gradient(135deg, #cf7c2a, #f3b066);
  color: #1e1308;
  font-weight: 700;
  cursor: pointer;
}

.invite-footer {
  margin-top: 1.5rem;
  font-size: 0.92rem;
  color: rgba(248, 240, 228, 0.66);
}

.invite-footer a {
  color: #f3b066;
  text-decoration: none;
}

</style>
