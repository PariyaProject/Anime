<template>
  <div class="auth-screen">
    <section class="hero-panel">
      <div class="ambient-grid"></div>
      <div class="ambient-glow glow-a"></div>
      <div class="ambient-glow glow-b"></div>
      <div class="ambient-orbit orbit-a"></div>
      <div class="ambient-orbit orbit-b"></div>

      <div class="hero-layout">
        <div class="hero-copy">
          <p class="eyebrow">Anime Access</p>
          <h1>{{ bootstrap?.loginTitle || 'Anime' }}</h1>
          <div class="hero-signals" aria-hidden="true">
            <span class="signal-pill">SYNC</span>
            <span class="signal-pill">WATCH</span>
            <span class="signal-pill">ARCHIVE</span>
          </div>
        </div>

        <div class="hero-showcase" aria-hidden="true">
          <article class="showcase-card showcase-card-primary">
            <div class="showcase-card-head">
              <span class="showcase-dot"></span>
              <span class="showcase-label">片单</span>
            </div>
            <div class="poster-stack">
              <div class="poster poster-a"></div>
              <div class="poster poster-b"></div>
              <div class="poster poster-c"></div>
            </div>
            <div class="shelf-copy">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </article>

          <div class="showcase-side">
            <article class="showcase-card showcase-card-secondary">
              <div class="showcase-card-head">
                <span class="showcase-dot"></span>
                <span class="showcase-label">续播</span>
              </div>
              <div class="resume-card">
                <div class="resume-meta">
                  <span class="episode-chip">EP 12</span>
                  <span class="resume-time">18:24</span>
                </div>
                <div class="resume-progress">
                  <span class="resume-progress-fill"></span>
                </div>
                <div class="resume-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </article>

            <article class="showcase-card showcase-card-tertiary">
              <div class="showcase-card-head">
                <span class="showcase-dot"></span>
                <span class="showcase-label">同步</span>
              </div>
              <div class="sync-card">
                <div class="sync-nodes">
                  <span class="sync-node"></span>
                  <span class="sync-bridge"></span>
                  <span class="sync-node"></span>
                </div>
                <div class="sync-lines">
                  <span></span>
                  <span></span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="login-panel">
      <div class="panel-orbit orbit-c"></div>
      <div class="panel-orbit orbit-d"></div>

      <div class="film-ribbon">
        <div class="ribbon-reel reel-left"></div>
        <div class="ribbon-reel reel-right"></div>
        <div class="film-strip">
          <div class="film-strip-core">
            <article class="film-frame film-frame-ambient film-frame-slim">
              <div class="film-mini-track">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </article>

            <article class="film-frame film-frame-ambient">
              <div class="film-poster poster-one"></div>
              <div class="film-caption">
                <span></span>
                <span></span>
              </div>
            </article>

            <article class="film-frame film-frame-login">
              <div class="panel-card">
                <div class="card-sheen" aria-hidden="true"></div>
                <div class="card-header">
                  <p class="card-kicker">{{ bootstrap?.siteName || 'Anime' }}</p>
                  <h2>账号登录</h2>
                </div>

                <form class="login-form" @submit.prevent="submit">
                  <label class="field">
                    <span>用户名</span>
                    <input
                      v-model.trim="username"
                      type="text"
                      autocomplete="username"
                      placeholder="输入用户名"
                      required
                    />
                  </label>

                  <label class="field">
                    <span>密码</span>
                    <input
                      v-model="password"
                      type="password"
                      autocomplete="current-password"
                      placeholder="输入密码"
                      required
                    />
                  </label>

                  <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

                  <button class="submit-button" type="submit" :disabled="authStore.loading">
                    {{ authStore.loading ? '正在验证...' : '进入站点' }}
                  </button>
                </form>

                <div class="card-pulse-row" aria-hidden="true">
                  <span class="pulse-dot pulse-dot-primary"></span>
                  <span class="pulse-line pulse-line-strong"></span>
                  <span class="pulse-line"></span>
                </div>

                <div v-if="bootstrap?.supportContact" class="support-strip">
                  <span class="support-label">联系</span>
                  <span class="support-value">{{ bootstrap.supportContact }}</span>
                </div>
              </div>
            </article>

            <article class="film-frame film-frame-ambient film-frame-alt">
              <div class="film-wave">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="film-caption">
                <span></span>
                <span></span>
              </div>
            </article>

            <article class="film-frame film-frame-ambient film-frame-slim film-frame-slim-alt">
              <div class="film-mini-track">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div class="mobile-login-card">
        <div class="panel-card">
          <div class="card-sheen" aria-hidden="true"></div>
          <div class="card-header">
            <p class="card-kicker">{{ bootstrap?.siteName || 'Anime' }}</p>
            <h2>账号登录</h2>
          </div>

          <form class="login-form" @submit.prevent="submit">
            <label class="field">
              <span>用户名</span>
              <input
                v-model.trim="username"
                type="text"
                autocomplete="username"
                placeholder="输入用户名"
                required
              />
            </label>

            <label class="field">
              <span>密码</span>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                placeholder="输入密码"
                required
              />
            </label>

            <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

            <button class="submit-button" type="submit" :disabled="authStore.loading">
              {{ authStore.loading ? '正在验证...' : '进入站点' }}
            </button>
          </form>

          <div class="card-pulse-row" aria-hidden="true">
            <span class="pulse-dot pulse-dot-primary"></span>
            <span class="pulse-line pulse-line-strong"></span>
            <span class="pulse-line"></span>
          </div>

          <div v-if="bootstrap?.supportContact" class="support-strip">
            <span class="support-label">联系</span>
            <span class="support-value">{{ bootstrap.supportContact }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

const username = ref('')
const password = ref('')
const errorMessage = ref('')

const bootstrap = authStore.publicBootstrap

async function submit() {
  errorMessage.value = ''

  try {
    await authStore.login({
      username: username.value,
      password: password.value
    })
    uiStore.showNotification('欢迎回来', 'success')

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    if (authStore.user?.isAdmin && !redirect) {
      await router.push({ name: 'Admin' })
      return
    }

    await router.push(redirect || '/')
  } catch (err: any) {
    errorMessage.value = err.message || '登录失败'
  }
}

onMounted(async () => {
  uiStore.loadDarkModePreference()
  await authStore.ensurePublicBootstrap()
})
</script>

<style scoped>
.auth-screen {
  height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  background:
    radial-gradient(circle at top left, rgba(214, 129, 42, 0.28), transparent 34%),
    radial-gradient(circle at bottom right, rgba(200, 70, 46, 0.22), transparent 28%),
    linear-gradient(135deg, #090b10 0%, #10141d 42%, #17131a 100%);
  color: #f5ede1;
  overflow: hidden;
}

.hero-panel,
.login-panel {
  position: relative;
  min-height: 0;
  padding: clamp(1.15rem, 2.8vh, 2.4rem) clamp(1.2rem, 3vw, 3rem);
}

.hero-panel {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-layout {
  position: relative;
  z-index: 2;
  width: min(100%, 820px);
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(260px, 0.82fr);
  gap: clamp(1.5rem, 3vw, 3rem);
  align-items: center;
}

.hero-copy {
  max-width: 30rem;
}

.eyebrow,
.card-kicker {
  margin: 0 0 1rem;
  font-size: 0.78rem;
  letter-spacing: 0.32rem;
  text-transform: uppercase;
  color: rgba(245, 223, 195, 0.7);
}

.hero-copy h1,
.card-header h2 {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
  font-weight: 700;
}

.hero-copy h1 {
  font-size: clamp(2.5rem, 5.2vw, 5rem);
  line-height: 0.92;
  max-width: 8ch;
}

.hero-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.6rem;
}

.signal-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 6.3rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(247, 236, 221, 0.88);
  font-size: 0.74rem;
  letter-spacing: 0.18rem;
}

.hero-showcase {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 0.9fr;
  gap: 1rem;
  min-height: min(24rem, 54vh);
}

.showcase-side {
  display: grid;
  gap: 1rem;
  align-self: center;
}

.showcase-card {
  position: relative;
  overflow: hidden;
  border-radius: 1.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(7, 10, 15, 0.5);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
}

.showcase-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.22));
  pointer-events: none;
}

.showcase-card-primary {
  min-height: min(24rem, 54vh);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: rotate(-6deg);
}

.showcase-card-secondary,
.showcase-card-tertiary {
  padding: 1rem;
}

.showcase-card-secondary {
  min-height: min(10rem, 22vh);
  transform: translateY(1.6rem);
}

.showcase-card-tertiary {
  min-height: min(7.2rem, 16vh);
  transform: rotate(4deg);
}

.showcase-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.showcase-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0ba7e, #d66642);
  box-shadow: 0 0 18px rgba(230, 137, 58, 0.35);
}

.showcase-label {
  color: rgba(255, 241, 224, 0.8);
  font-size: 0.78rem;
  letter-spacing: 0.12rem;
}

.poster-stack {
  position: relative;
  z-index: 1;
  flex: 1;
  margin: 1rem 0;
  min-height: min(13rem, 30vh);
}

.poster {
  position: absolute;
  width: min(10rem, 44%);
  aspect-ratio: 3 / 4;
  border-radius: 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);
}

.poster-a {
  left: 0;
  bottom: 0.7rem;
  background:
    radial-gradient(circle at 30% 26%, rgba(255, 205, 125, 0.92), transparent 22%),
    linear-gradient(160deg, rgba(59, 72, 108, 0.96), rgba(20, 26, 38, 0.86));
  transform: rotate(-9deg);
}

.poster-b {
  left: 28%;
  top: 0.2rem;
  background:
    radial-gradient(circle at 64% 28%, rgba(244, 142, 101, 0.92), transparent 22%),
    linear-gradient(155deg, rgba(82, 44, 72, 0.98), rgba(23, 18, 32, 0.86));
  transform: rotate(-1deg);
}

.poster-c {
  right: 0.1rem;
  bottom: 0;
  background:
    radial-gradient(circle at 44% 26%, rgba(124, 160, 255, 0.85), transparent 24%),
    linear-gradient(160deg, rgba(35, 54, 87, 0.98), rgba(16, 21, 31, 0.88));
  transform: rotate(8deg);
}

.poster::after {
  content: '';
  position: absolute;
  inset: auto 12% 10% 12%;
  height: 0.42rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 -1rem 0 rgba(255, 255, 255, 0.08);
}

.shelf-copy,
.sync-lines,
.film-caption {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.55rem;
}

.shelf-copy span,
.sync-lines span,
.film-caption span {
  display: block;
  height: 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.shelf-copy span:nth-child(1) {
  width: 76%;
}

.shelf-copy span:nth-child(2) {
  width: 58%;
}

.shelf-copy span:nth-child(3) {
  width: 84%;
}

.resume-card,
.sync-card {
  position: relative;
  z-index: 1;
  margin-top: 1.1rem;
  display: flex;
  flex-direction: column;
}

.resume-card {
  gap: 0.85rem;
}

.resume-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.episode-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(251, 242, 233, 0.88);
  font-size: 0.74rem;
  letter-spacing: 0.08rem;
}

.resume-time {
  color: rgba(255, 231, 208, 0.82);
  font-size: 0.82rem;
  letter-spacing: 0.08rem;
}

.resume-progress {
  width: 100%;
  height: 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.resume-progress-fill {
  display: block;
  width: 62%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(255, 200, 128, 0.92), rgba(219, 102, 76, 0.88));
}

.resume-dots {
  display: flex;
  gap: 0.45rem;
}

.resume-dots span {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}

.resume-dots span:nth-child(2) {
  background: rgba(255, 192, 119, 0.86);
  box-shadow: 0 0 14px rgba(255, 192, 119, 0.34);
}

.sync-card {
  gap: 1rem;
  justify-content: center;
  min-height: 4.8rem;
}

.sync-nodes {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
}

.sync-node {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 205, 127, 0.92), rgba(217, 110, 72, 0.84));
  box-shadow: 0 0 18px rgba(232, 142, 77, 0.28);
}

.sync-bridge {
  height: 2px;
  border-radius: 999px;
  background:
    linear-gradient(90deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(245, 186, 126, 0.92) 48%,
      rgba(255, 255, 255, 0.08) 100%);
  position: relative;
  overflow: hidden;
}

.sync-bridge::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.88), transparent);
  transform: translateX(-100%);
  animation: sync-flow 3.6s linear infinite;
}

.sync-lines span:nth-child(1) {
  width: 72%;
}

.sync-lines span:nth-child(2) {
  width: 46%;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.panel-orbit {
  position: absolute;
  pointer-events: none;
}

.panel-orbit {
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.orbit-c {
  width: 32rem;
  height: 32rem;
  top: 10%;
  right: -10rem;
}

.orbit-d {
  width: 18rem;
  height: 18rem;
  left: 8%;
  bottom: 10%;
  border-style: dashed;
}

.film-ribbon {
  position: relative;
  z-index: 2;
  width: min(100%, 44rem);
  height: 100%;
  min-height: 0;
  max-height: calc(100dvh - clamp(2.3rem, 5.6vh, 4.8rem));
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ribbon-drift 14s ease-in-out infinite;
  pointer-events: auto;
}

.ribbon-reel {
  position: absolute;
  width: 7rem;
  height: 7rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.1) 0 0.4rem, transparent 0.4rem),
    radial-gradient(circle, rgba(255, 255, 255, 0.1) 0 0.4rem, transparent 0.4rem),
    radial-gradient(circle, rgba(255, 255, 255, 0.1) 0 0.4rem, transparent 0.4rem),
    rgba(0, 0, 0, 0.22);
  background-size: 1.8rem 1.8rem;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2);
}

.reel-left {
  left: 50%;
  top: -0.8rem;
  transform: translateX(-50%);
}

.reel-right {
  left: 50%;
  bottom: -0.6rem;
  transform: translateX(-50%);
}

.film-strip {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 2.6rem;
  min-height: 0;
  padding: clamp(1.5rem, 3.2vh, 2.2rem) clamp(1.7rem, 3.2vw, 2.5rem);
  background:
    linear-gradient(180deg, rgba(25, 28, 34, 0.94), rgba(10, 12, 16, 0.96));
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.34);
  overflow: hidden;
}

.film-strip::before,
.film-strip::after {
  content: '';
  position: absolute;
  top: 1.1rem;
  bottom: 1.1rem;
  width: 1.05rem;
  background-image: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.1) 0 0.9rem,
    transparent 0.9rem 2rem
  );
  opacity: 0.75;
}

.film-strip::before {
  left: 0.7rem;
}

.film-strip::after {
  right: 0.7rem;
}

.film-strip-core {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: minmax(3.6rem, 0.36fr) minmax(7rem, 0.88fr) minmax(16.5rem, 1.55fr) minmax(7rem, 0.88fr) minmax(3.2rem, 0.32fr);
  gap: clamp(0.75rem, 1.6vh, 1rem);
  align-items: stretch;
  min-height: 100%;
}

.film-frame {
  position: relative;
  min-height: 0;
  border-radius: 1.7rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015)),
    rgba(255, 255, 255, 0.02);
}

.film-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.22));
  pointer-events: none;
}

.film-frame-ambient {
  padding: clamp(0.7rem, 1.4vh, 1rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.film-frame-slim {
  min-height: 0;
  padding: 0.7rem 0.9rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01)),
    rgba(255, 255, 255, 0.015);
}

.film-frame-login {
  padding: 0.4rem;
  min-height: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(0, 0, 0, 0.12);
}

.film-poster {
  flex: 1;
  border-radius: 1.15rem;
  background:
    radial-gradient(circle at 28% 24%, rgba(255, 205, 125, 0.92), transparent 22%),
    radial-gradient(circle at 70% 68%, rgba(217, 103, 76, 0.62), transparent 26%),
    linear-gradient(160deg, rgba(46, 55, 78, 0.96), rgba(20, 25, 35, 0.88));
  min-height: 0;
}

.poster-one {
  transform: rotate(-4deg);
}

.film-frame-alt .film-wave {
  flex: 1;
  display: grid;
  align-items: end;
  gap: 0.65rem;
}

.film-mini-track {
  height: 100%;
  display: grid;
  align-content: center;
  gap: 0.45rem;
}

.film-mini-track span {
  display: block;
  height: 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.film-frame-slim .film-mini-track span:nth-child(1) {
  width: 78%;
}

.film-frame-slim .film-mini-track span:nth-child(2) {
  width: 62%;
}

.film-frame-slim .film-mini-track span:nth-child(3) {
  width: 88%;
}

.film-frame-slim .film-mini-track span:nth-child(4) {
  width: 54%;
}

.film-frame-slim-alt .film-mini-track span:nth-child(1) {
  width: 64%;
}

.film-frame-slim-alt .film-mini-track span:nth-child(2) {
  width: 86%;
}

.film-frame-slim-alt .film-mini-track span:nth-child(3) {
  width: 58%;
}

.film-wave span {
  display: block;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(244, 184, 125, 0.22), rgba(255, 255, 255, 0.06));
  height: clamp(0.75rem, 1.4vh, 1.1rem);
}

.film-wave span:nth-child(1) {
  width: 88%;
}

.film-wave span:nth-child(2) {
  width: 66%;
}

.film-wave span:nth-child(3) {
  width: 94%;
}

.film-caption span:first-child {
  width: 76%;
}

.film-caption span:last-child {
  width: 54%;
}

.panel-card {
  position: relative;
  width: 100%;
  min-height: 100%;
  padding: clamp(1.35rem, 2.6vh, 2.1rem) clamp(1.25rem, 2.2vw, 2rem);
  border-radius: 1.7rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
    rgba(8, 10, 14, 0.78);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(20px);
}

.card-header {
  margin-bottom: clamp(1rem, 2vh, 1.45rem);
}

.card-sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}

.card-sheen::after {
  content: '';
  position: absolute;
  inset: -30%;
  background: linear-gradient(120deg, transparent 38%, rgba(255, 255, 255, 0.08) 50%, transparent 62%);
  transform: translateX(-100%) rotate(12deg);
  animation: sheen-sweep 14s linear infinite;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.35vh, 1rem);
}

.card-pulse-row {
  margin-top: 1.1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  grid-template-columns: auto 1fr 0.65fr;
  align-items: center;
  gap: 0.7rem;
}

.pulse-dot,
.pulse-line {
  display: block;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.pulse-dot {
  width: 0.7rem;
  height: 0.7rem;
}

.pulse-dot-primary {
  background: linear-gradient(135deg, #f0ba7e, #d66642);
  box-shadow: 0 0 16px rgba(230, 137, 58, 0.34);
}

.pulse-line {
  height: 0.65rem;
}

.pulse-line-strong {
  background: linear-gradient(90deg, rgba(244, 184, 125, 0.82), rgba(255, 255, 255, 0.08));
}

.support-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 1.15rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.support-label {
  color: rgba(245, 223, 195, 0.66);
  font-size: 0.76rem;
  letter-spacing: 0.16rem;
  text-transform: uppercase;
}

.support-value {
  color: rgba(252, 244, 236, 0.9);
  font-size: 0.94rem;
  word-break: break-word;
  text-align: right;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field span {
  font-size: 0.9rem;
  color: rgba(255, 245, 233, 0.9);
}

.field input {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.95rem;
  background: rgba(7, 9, 13, 0.64);
  color: #fdf7ef;
  padding: clamp(0.8rem, 1.45vh, 1rem) 1rem;
  font-size: 1rem;
}

.field input:focus {
  outline: none;
  border-color: rgba(241, 165, 69, 0.8);
  box-shadow: 0 0 0 4px rgba(241, 165, 69, 0.14);
}

.submit-button {
  margin-top: 0.5rem;
  border: 0;
  border-radius: 999px;
  padding: clamp(0.85rem, 1.55vh, 1rem) 1.1rem;
  background: linear-gradient(135deg, #cf7c2a, #f3b066);
  color: #180e04;
  font-weight: 700;
  letter-spacing: 0.04rem;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(207, 124, 42, 0.28);
}

.submit-button:disabled {
  opacity: 0.68;
  cursor: wait;
}

.error-text {
  margin: 0;
  color: #ff9a83;
  font-size: 0.92rem;
}

.ambient-orbit {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  filter: blur(0.4px);
}

.ambient-grid,
.ambient-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ambient-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 120px 120px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.68), transparent 92%);
}

.ambient-glow {
  filter: blur(70px);
  opacity: 0.5;
}

.glow-a {
  inset: auto auto 4% -10%;
  width: 22rem;
  height: 22rem;
  background: rgba(240, 147, 81, 0.34);
}

.glow-b {
  inset: 6% 18% auto auto;
  width: 18rem;
  height: 18rem;
  background: rgba(107, 120, 255, 0.14);
}

.orbit-a {
  width: 28rem;
  height: 28rem;
  left: -8rem;
  top: -6rem;
}

.orbit-b {
  width: 18rem;
  height: 18rem;
  right: 8rem;
  bottom: 10%;
  border-style: dashed;
}

.mobile-login-card {
  display: none;
  width: 100%;
  position: relative;
  z-index: 2;
}

@keyframes sync-flow {
  100% {
    transform: translateX(100%);
  }
}

@keyframes sheen-sweep {
  100% {
    transform: translateX(100%) rotate(12deg);
  }
}

@keyframes ribbon-drift {
  0%,
  100% {
    transform: translateY(0) rotate(-1deg);
  }

  50% {
    transform: translateY(-0.35rem) rotate(0.65deg);
  }
}

@media (max-height: 880px) and (min-width: 641px) {
  .hero-panel,
  .login-panel {
    padding: 1rem 1.4rem;
  }

  .hero-layout {
    gap: 1.2rem;
  }

  .hero-copy h1 {
    font-size: clamp(2.2rem, 4.5vw, 4rem);
  }

  .hero-signals {
    margin-top: 1rem;
  }

  .film-ribbon {
    max-height: calc(100dvh - 2rem);
  }

  .film-strip {
    padding: 1.4rem 1.8rem;
  }

  .film-strip-core {
    grid-template-rows: minmax(3rem, 0.26fr) minmax(5.8rem, 0.76fr) minmax(15rem, 1.45fr) minmax(5.8rem, 0.76fr) minmax(2.8rem, 0.24fr);
    gap: 0.75rem;
  }

  .panel-card {
    padding: 1.4rem 1.3rem;
  }

  .card-header {
    margin-bottom: 0.95rem;
  }

  .login-form {
    gap: 0.72rem;
  }

  .field input {
    padding: 0.72rem 0.9rem;
  }

  .submit-button {
    padding: 0.82rem 1rem;
  }
}

@media (max-height: 760px) and (min-width: 641px) {
  .hero-showcase {
    min-height: 0;
    max-height: 18vh;
  }

  .showcase-card-primary,
  .showcase-card-secondary,
  .showcase-card-tertiary {
    min-height: 0;
  }

  .showcase-side {
    gap: 0.7rem;
  }

  .film-frame-slim {
    display: none;
  }

  .film-strip-core {
    grid-template-rows: minmax(5.4rem, 0.7fr) minmax(14.4rem, 1.7fr) minmax(5.4rem, 0.7fr);
  }

  .film-frame-login {
    min-height: 0;
  }
}

@media (max-height: 680px) and (min-width: 641px) {
  .hero-showcase {
    display: none;
  }

  .hero-layout {
    grid-template-columns: 1fr;
    align-items: center;
  }

  .hero-copy {
    max-width: 24rem;
  }

  .hero-signals {
    gap: 0.5rem;
  }

  .signal-pill {
    min-width: 5.1rem;
    padding: 0.42rem 0.7rem;
    font-size: 0.68rem;
  }

  .film-strip {
    padding: 1.2rem 1.55rem;
  }

  .film-strip-core {
    grid-template-rows: minmax(4.2rem, 0.55fr) minmax(13.2rem, 1.55fr) minmax(4.2rem, 0.55fr);
    gap: 0.65rem;
  }
}

@media (max-width: 980px) {
  .auth-screen {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 0.66fr) minmax(0, 1fr);
  }

  .hero-panel {
    padding-bottom: 0.5rem;
  }

  .hero-layout {
    width: 100%;
    grid-template-columns: 1fr;
    align-items: center;
    gap: 1rem;
  }

  .hero-copy {
    max-width: none;
  }

  .hero-copy h1 {
    font-size: clamp(2rem, 6vw, 3.4rem);
  }

  .hero-showcase {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr) minmax(160px, 0.82fr);
    max-height: 26vh;
  }

  .film-ribbon {
    width: 100%;
    max-height: none;
  }

  .film-strip-core {
    grid-template-columns: 1fr;
    grid-template-rows: unset;
  }

  .film-frame-ambient {
    min-height: 0;
  }

  .film-frame-login {
    order: -1;
  }
}

@media (max-width: 640px) {
  .auth-screen {
    grid-template-rows: minmax(0, 0.54fr) minmax(0, 1fr);
  }

  .hero-panel,
  .login-panel {
    padding: 1rem;
  }

  .hero-showcase {
    display: none;
  }

  .hero-copy h1 {
    font-size: clamp(1.85rem, 8vw, 2.7rem);
  }

  .showcase-card-primary,
  .showcase-card-secondary,
  .showcase-card-tertiary {
    transform: none;
  }

  .showcase-card-primary {
    min-height: 15rem;
  }

  .showcase-side {
    grid-template-columns: 1fr 1fr;
  }

  .film-ribbon {
    display: none;
  }

  .mobile-login-card {
    display: block;
    align-self: stretch;
    display: flex;
    align-items: center;
  }

  .support-strip {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
