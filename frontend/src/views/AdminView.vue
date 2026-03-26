<template>
  <div class="admin-view" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <div class="admin-layout">
      <section class="admin-hero">
        <div class="hero-copy">
          <p class="eyebrow">Anime Control</p>
          <h1>站点与账号管理</h1>
          <p>
            统一管理站点文案、邀请链接、用户登录权限，以及每个账号的最近登录和观看记录。
          </p>
        </div>

        <div class="hero-actions">
          <input
            ref="databaseImportInput"
            type="file"
            accept=".sqlite,.sqlite3,.db,application/octet-stream"
            class="hidden-file-input"
            @change="handleDatabaseFilePicked"
          />
          <button
            class="secondary-button"
            type="button"
            @click="openDatabaseRestorePicker"
            :disabled="restoringBackup"
          >
            {{ restoringBackup ? '导入中...' : '导入数据库备份' }}
          </button>
          <button
            class="secondary-button"
            type="button"
            @click="downloadDatabaseBackup"
            :disabled="downloadingBackup"
          >
            {{ downloadingBackup ? '备份中...' : '下载数据库备份' }}
          </button>
          <button class="refresh-button" type="button" @click="loadOverview" :disabled="loading">
            {{ loading ? '刷新中...' : '刷新数据' }}
          </button>
        </div>
      </section>

      <section class="stats-grid">
        <article class="stat-card">
          <span>账号总数</span>
          <strong>{{ userPagination.overallTotal ?? userPagination.total }}</strong>
        </article>
        <article class="stat-card">
          <span>已禁用账号</span>
          <strong>{{ userPagination.disabledTotal ?? disabledUsersCount }}</strong>
        </article>
        <article class="stat-card">
          <span>管理员账号</span>
          <strong>{{ userPagination.adminTotal ?? 0 }}</strong>
        </article>
        <article class="stat-card">
          <span>普通用户</span>
          <strong>{{ userPagination.userTotal ?? 0 }}</strong>
        </article>
      </section>

      <div class="dashboard-grid">
        <section class="panel panel-users">
        <div class="panel-header">
          <div>
            <p class="panel-eyebrow">Accounts</p>
            <h2>账号总览</h2>
          </div>
          <span class="panel-meta">
            搜索结果 {{ userPagination.total }} 个 · 第 {{ userPagination.page }} / {{ userPagination.totalPages }} 页
          </span>
        </div>

        <form class="user-search" @submit.prevent="applyUserSearch">
          <input
            v-model.trim="userSearchDraft"
            type="text"
            class="search-input"
            placeholder="搜索用户名"
          />
          <button class="ghost-button" type="submit">搜索</button>
          <button class="ghost-button" type="button" @click="resetUserSearch" :disabled="!userSearchKeyword">
            清空
          </button>
        </form>

        <div class="filter-row">
          <button
            class="filter-chip"
            :class="{ active: userRoleFilter === 'all' }"
            type="button"
            @click="applyRoleFilter('all')"
          >
            全部角色
          </button>
          <button
            class="filter-chip"
            :class="{ active: userRoleFilter === 'admin' }"
            type="button"
            @click="applyRoleFilter('admin')"
          >
            管理员
          </button>
          <button
            class="filter-chip"
            :class="{ active: userRoleFilter === 'user' }"
            type="button"
            @click="applyRoleFilter('user')"
          >
            普通用户
          </button>
          <button
            class="filter-chip"
            :class="{ active: userStatusFilter === 'all' }"
            type="button"
            @click="applyStatusFilter('all')"
          >
            全部状态
          </button>
          <button
            class="filter-chip"
            :class="{ active: userStatusFilter === 'active' }"
            type="button"
            @click="applyStatusFilter('active')"
          >
            正常
          </button>
          <button
            class="filter-chip"
            :class="{ active: userStatusFilter === 'disabled' }"
            type="button"
            @click="applyStatusFilter('disabled')"
          >
            已禁用
          </button>
        </div>

        <div class="user-list">
          <button
            v-for="user in users"
            :key="user.id"
            type="button"
            class="user-card"
            :class="{ active: selectedUserId === user.id }"
            @click="selectUser(user.id)"
          >
            <div class="user-card-top">
              <strong>{{ user.username }}</strong>
              <span class="user-badge" :class="`status-${user.status}`">
                {{ user.status === 'disabled' ? '已禁用' : '正常' }}
              </span>
            </div>
            <div class="user-card-subline">
              <span>{{ user.isAdmin ? '管理员' : '普通用户' }}</span>
              <span>观看 {{ user.watchProgressCount }} 条</span>
            </div>
            <div class="user-card-subline dim">
              <span>最近登录 {{ formatDate(user.lastLoginAt) }}</span>
            </div>
          </button>
          <p v-if="users.length === 0" class="empty-tip">当前搜索条件下没有账号</p>
        </div>

        <div class="pagination-bar" v-if="userPagination.totalPages > 1">
          <button
            class="ghost-button"
            type="button"
            :disabled="userPagination.page <= 1"
            @click="changeUserPage(userPagination.page - 1)"
          >
            上一页
          </button>
          <span class="pagination-info">
            第 {{ userPagination.page }} / {{ userPagination.totalPages }} 页，共 {{ userPagination.total }} 个
          </span>
          <button
            class="ghost-button"
            type="button"
            :disabled="userPagination.page >= userPagination.totalPages"
            @click="changeUserPage(userPagination.page + 1)"
          >
            下一页
          </button>
        </div>
      </section>

      <section class="panel panel-account">
        <div v-if="selectedUserDetails" class="account-detail">
          <div class="panel-header">
            <div>
              <p class="panel-eyebrow">Account Detail</p>
              <h2>{{ selectedUserDetails.user.username }}</h2>
            </div>
            <span class="panel-meta">
              {{
                selectedUserDetails.user.isEnvSuperAdmin
                  ? '环境变量管理员'
                  : (selectedUserDetails.user.isAdmin ? '管理员账号' : '普通账号')
              }}
            </span>
          </div>

          <div class="detail-summary-grid">
            <article>
              <span>当前状态</span>
              <strong>{{ selectedUserDetails.user.status === 'disabled' ? '已禁用' : '正常可登录' }}</strong>
            </article>
            <article>
              <span>创建时间</span>
              <strong>{{ formatDate(selectedUserDetails.user.createdAt) }}</strong>
            </article>
            <article>
              <span>最近登录</span>
              <strong>{{ formatDate(selectedUserDetails.user.lastLoginAt) }}</strong>
            </article>
            <article>
              <span>最近观看</span>
              <strong>{{ formatDate(selectedUserDetails.user.lastWatchedAt) }}</strong>
            </article>
          </div>

          <div class="access-card">
            <div>
              <p class="access-title">账号角色</p>
              <p class="access-text">
                邀请码默认只能创建普通用户。管理员权限需要在这里单独提升或降级。
              </p>
            </div>

            <div class="access-actions">
              <div class="notice-banner" v-if="selectedUserDetails.user.isEnvSuperAdmin">
                环境变量管理员固定保留为管理员角色，不能降级。
              </div>
              <button
                v-else-if="selectedUserDetails.user.isAdmin"
                class="secondary-button"
                type="button"
                :disabled="updatingRole"
                @click="updateUserRole(false)"
              >
                {{ updatingRole ? '处理中...' : '降级为普通用户' }}
              </button>
              <button
                v-else
                class="secondary-button"
                type="button"
                :disabled="updatingRole"
                @click="updateUserRole(true)"
              >
                {{ updatingRole ? '处理中...' : '提升为管理员' }}
              </button>
            </div>
          </div>

          <div class="access-card">
            <div>
              <p class="access-title">账号访问控制</p>
              <p class="access-text">
                可以临时禁用账号登录。被禁用后，当前会话也会被立刻清除。
              </p>
            </div>

            <div v-if="!selectedUserDetails.user.isAdmin" class="access-actions">
              <textarea
                v-model="accessReason"
                rows="3"
                class="reason-input"
                placeholder="禁用原因，例如：滥用、测试结束、需要冻结账号"
              ></textarea>
              <button
                v-if="selectedUserDetails.user.status === 'active'"
                class="danger-button"
                type="button"
                :disabled="savingAccess"
                @click="updateUserAccess(true)"
              >
                {{ savingAccess ? '处理中...' : '禁用登录' }}
              </button>
              <button
                v-else
                class="primary-button"
                type="button"
                :disabled="savingAccess"
                @click="updateUserAccess(false)"
              >
                {{ savingAccess ? '处理中...' : '恢复账号' }}
              </button>
            </div>

            <div v-else class="access-actions">
              <div class="notice-banner">
                管理员账号不可禁用，避免把系统锁死。
              </div>
            </div>
          </div>

          <div v-if="selectedUserDetails.user.disabledReason" class="notice-banner">
            当前禁用原因：{{ selectedUserDetails.user.disabledReason }}
          </div>

          <div class="access-card">
            <div>
              <p class="access-title">密码重置</p>
              <p class="access-text">
                管理员可以直接为该账号设置一个新密码。重置后，该账号所有已登录设备都会失效，需要使用新密码重新登录。
              </p>
            </div>

            <div v-if="selectedUserDetails.user.id === authStore.user?.id" class="access-actions">
              <div class="notice-banner">
                当前选中的是你自己，请使用
                <router-link to="/account/security">账号安全</router-link>
                页面修改密码。
              </div>
            </div>

            <div v-else class="access-actions">
              <div class="password-reset-grid">
                <label class="field">
                  <span>新密码</span>
                  <input
                    v-model="resetPasswordForm.password"
                    type="password"
                    autocomplete="new-password"
                    placeholder="至少 8 位"
                  />
                </label>
                <label class="field">
                  <span>确认新密码</span>
                  <input
                    v-model="resetPasswordForm.confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    placeholder="再次输入新密码"
                  />
                </label>
              </div>
              <button
                class="secondary-button"
                type="button"
                :disabled="resettingPassword"
                @click="resetUserPassword"
              >
                {{ resettingPassword ? '处理中...' : '重置密码' }}
              </button>
            </div>
          </div>

          <div class="detail-columns">
            <section class="detail-panel">
              <div class="detail-panel-header">
                <h3>登录记录</h3>
                <span>
                  第 {{ selectedUserDetails.loginPagination.page }} / {{ selectedUserDetails.loginPagination.totalPages }} 页
                </span>
              </div>
              <div class="detail-list">
                <article
                  v-for="event in selectedUserDetails.loginEvents"
                  :key="event.id"
                  class="detail-item"
                >
                  <div class="detail-item-head">
                    <strong>{{ event.success ? '登录成功' : '登录失败' }}</strong>
                    <span :class="event.success ? 'tone-success' : 'tone-danger'">
                      {{ formatDate(event.createdAt) }}
                    </span>
                  </div>
                  <p>{{ event.reason || '无额外说明' }}</p>
                  <small>{{ event.ipAddress || '未知 IP' }} · {{ simplifyUserAgent(event.userAgent) }}</small>
                </article>
                <p v-if="selectedUserDetails.loginEvents.length === 0" class="empty-tip">暂无登录记录</p>
              </div>
              <div class="pagination-bar" v-if="selectedUserDetails.loginPagination.totalPages > 1">
                <button
                  class="ghost-button"
                  type="button"
                  :disabled="selectedUserDetails.loginPagination.page <= 1"
                  @click="changeLoginPage(selectedUserDetails.loginPagination.page - 1)"
                >
                  上一页
                </button>
                <span class="pagination-info">
                  第 {{ selectedUserDetails.loginPagination.page }} / {{ selectedUserDetails.loginPagination.totalPages }} 页
                </span>
                <button
                  class="ghost-button"
                  type="button"
                  :disabled="selectedUserDetails.loginPagination.page >= selectedUserDetails.loginPagination.totalPages"
                  @click="changeLoginPage(selectedUserDetails.loginPagination.page + 1)"
                >
                  下一页
                </button>
              </div>
            </section>

            <section class="detail-panel">
              <div class="detail-panel-header">
                <h3>当前观看记录</h3>
                <span>
                  第 {{ selectedUserDetails.watchPagination.page }} / {{ selectedUserDetails.watchPagination.totalPages }} 页
                </span>
              </div>
              <div class="detail-list">
                <article
                  v-for="record in selectedUserDetails.watchProgress"
                  :key="`${record.animeId}-${record.season}-${record.episode}`"
                  class="detail-item"
                >
                  <div class="detail-item-head">
                    <strong>{{ record.animeTitle }}</strong>
                    <span>{{ formatDate(record.watchDate) }}</span>
                  </div>
                  <p>
                    第 {{ record.season }} 季 · 第 {{ record.episode }} 集
                    <template v-if="record.episodeTitle">· {{ record.episodeTitle }}</template>
                  </p>
                  <small>
                    进度 {{ formatDuration(record.position) }}
                    <template v-if="record.duration > 0"> / {{ formatDuration(record.duration) }}</template>
                    <template v-if="record.completed"> · 已看完</template>
                    <template v-if="record.sourceDeviceId"> · 设备 {{ record.sourceDeviceId }}</template>
                  </small>
                </article>
                <p v-if="selectedUserDetails.watchProgress.length === 0" class="empty-tip">暂无观看记录</p>
              </div>
              <div class="pagination-bar" v-if="selectedUserDetails.watchPagination.totalPages > 1">
                <button
                  class="ghost-button"
                  type="button"
                  :disabled="selectedUserDetails.watchPagination.page <= 1"
                  @click="changeWatchPage(selectedUserDetails.watchPagination.page - 1)"
                >
                  上一页
                </button>
                <span class="pagination-info">
                  第 {{ selectedUserDetails.watchPagination.page }} / {{ selectedUserDetails.watchPagination.totalPages }} 页
                </span>
                <button
                  class="ghost-button"
                  type="button"
                  :disabled="selectedUserDetails.watchPagination.page >= selectedUserDetails.watchPagination.totalPages"
                  @click="changeWatchPage(selectedUserDetails.watchPagination.page + 1)"
                >
                  下一页
                </button>
              </div>
            </section>
          </div>

          <section class="detail-panel">
            <div class="detail-panel-header">
              <h3>活跃会话</h3>
              <span>{{ selectedUserDetails.activeSessions.length }} 条</span>
            </div>
            <div class="detail-list">
              <article
                v-for="session in selectedUserDetails.activeSessions"
                :key="session.id"
                class="detail-item"
              >
                <div class="detail-item-head">
                  <strong>{{ formatDate(session.lastSeenAt) }}</strong>
                  <span>{{ session.ipAddress || '未知 IP' }}</span>
                </div>
                <p>{{ simplifyUserAgent(session.userAgent) }}</p>
                <small>创建于 {{ formatDate(session.createdAt) }} · 过期于 {{ formatDate(session.expiresAt) }}</small>
              </article>
              <p v-if="selectedUserDetails.activeSessions.length === 0" class="empty-tip">当前没有活跃会话</p>
            </div>
          </section>
        </div>

        <div v-else class="empty-selection">
          <h2>选择一个账号</h2>
          <p>左侧点击任意账号后，这里会显示它的登录历史、当前观看记录和访问控制。</p>
        </div>
        </section>
      </div>

      <div class="secondary-grid">
        <section class="panel panel-settings">
        <div class="panel-header">
          <div>
            <p class="panel-eyebrow">Site Settings</p>
            <h2>站点基础设置</h2>
          </div>
        </div>

        <form class="settings-form" @submit.prevent="saveSettings">
          <label class="field">
            <span>站点名称</span>
            <input v-model="settings.siteName" type="text" />
          </label>
          <label class="field">
            <span>登录页标题</span>
            <input v-model="settings.loginTitle" type="text" />
          </label>
          <label class="field">
            <span>支持联系方式</span>
            <input v-model="settings.supportContact" type="text" placeholder="例如 Telegram / Email" />
          </label>
          <label class="switch-row">
            <input v-model="settings.allowInvites" type="checkbox" />
            <span>允许管理员创建普通用户邀请码</span>
          </label>

          <button class="primary-button" type="submit" :disabled="savingSettings">
            {{ savingSettings ? '保存中...' : '保存站点设置' }}
          </button>
        </form>
        </section>

        <section class="panel panel-invites">
        <div class="panel-header">
          <div>
            <p class="panel-eyebrow">Invites</p>
            <h2>邀请码管理</h2>
          </div>
        </div>

        <p class="panel-note">邀请码只会创建普通用户，管理员权限需要在账号详情里单独提升。</p>

        <form class="invite-creator" @submit.prevent="createInvite">
          <label class="field">
            <span>邀请备注</span>
            <input v-model="newInvite.note" type="text" placeholder="例如：测试账号 / 维护人员 / 朋友" />
          </label>
          <label class="field">
            <span>有效期（天）</span>
            <input v-model.number="newInvite.expiresInDays" type="number" min="1" max="365" />
          </label>
          <button class="primary-button" type="submit" :disabled="creatingInvite">
            {{ creatingInvite ? '生成中...' : '创建邀请码' }}
          </button>
        </form>

        <div v-if="latestInviteUrl" class="invite-link-box">
          <span>最新邀请链接</span>
          <code>{{ latestInviteUrl }}</code>
          <button type="button" class="copy-button" @click="copyInviteUrl">复制链接</button>
        </div>

        <div class="invite-list">
          <article v-for="invite in invites" :key="invite.id" class="invite-item">
            <div class="invite-meta">
              <span class="invite-status" :class="`status-${invite.status}`">{{ invite.status }}</span>
              <strong>{{ invite.note || '未命名邀请' }}</strong>
              <small>
                {{ formatDate(invite.createdAt) }}
                <template v-if="invite.usedBy"> · 已被 {{ invite.usedBy.username }} 使用</template>
              </small>
            </div>
            <div class="invite-actions">
              <button type="button" class="ghost-button" @click="copyInvite(invite.code)">复制链接</button>
              <button
                v-if="invite.status === 'active'"
                type="button"
                class="ghost-button danger"
                @click="revokeInvite(invite.id)"
              >
                撤销
              </button>
            </div>
          </article>
        </div>
        </section>
      </div>

      <section class="panel panel-runtime">
        <div class="panel-header">
          <div>
            <p class="panel-eyebrow">Runtime</p>
            <h2>当前运行环境</h2>
          </div>
        </div>

        <div class="runtime-grid">
          <article>
            <span>认证模式</span>
            <strong>{{ runtime.authMode }}</strong>
          </article>
          <article>
            <span>登录保持</span>
            <strong>{{ runtime.sessionDays }} 天</strong>
          </article>
          <article>
            <span>超级管理员</span>
            <strong>{{ runtime.superAdminConfigured ? '已配置' : '未配置' }}</strong>
          </article>
          <article>
            <span>后端端口</span>
            <strong>{{ runtime.ports.backend }}</strong>
          </article>
          <article>
            <span>前端端口</span>
            <strong>{{ runtime.ports.frontend }}</strong>
          </article>
          <article>
            <span>数据库</span>
            <strong class="mono">{{ runtime.databaseFile }}</strong>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { adminService } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useRoute } from 'vue-router'
import { copyTextToClipboard } from '@/utils/clipboard'
import type {
  AdminInvite,
  AdminManagedUser,
  AdminPaginationMeta,
  AdminUserDetails,
  RuntimeInfo,
  SiteSettings
} from '@/types/auth.types'

const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUiStore()
const isDarkMode = computed(() => uiStore.darkMode)

const loading = ref(false)
const savingSettings = ref(false)
const creatingInvite = ref(false)
const savingAccess = ref(false)
const updatingRole = ref(false)
const resettingPassword = ref(false)
const downloadingBackup = ref(false)
const restoringBackup = ref(false)
const invites = ref<AdminInvite[]>([])
const users = ref<AdminManagedUser[]>([])
const databaseImportInput = ref<HTMLInputElement | null>(null)
const selectedUserId = ref('')
const selectedUserDetails = ref<AdminUserDetails | null>(null)
const latestInviteUrl = ref('')
const accessReason = ref('')
const userSearchDraft = ref('')
const userSearchKeyword = ref('')
const userRoleFilter = ref<'all' | 'admin' | 'user'>('all')
const userStatusFilter = ref<'all' | 'active' | 'disabled'>('all')
const userPage = ref(1)
const userPageSize = 12
const loginPage = ref(1)
const watchPage = ref(1)
const detailPageSize = 10

const runtime = ref<RuntimeInfo>({
  databaseFile: '',
  authMode: 'invite-only',
  sessionDays: 400,
  allowInvites: true,
  superAdminConfigured: false,
  ports: {
    backend: '',
    frontend: ''
  }
})

const userPagination = ref<AdminPaginationMeta>({
  total: 0,
  overallTotal: 0,
  page: 1,
  pageSize: userPageSize,
  totalPages: 1
})

const settings = reactive<SiteSettings>({
  siteName: 'Anime',
  loginTitle: 'Anime',
  supportContact: '',
  allowInvites: true
})

const newInvite = reactive({
  note: '',
  expiresInDays: 30
})

const resetPasswordForm = reactive({
  password: '',
  confirmPassword: ''
})

const activeInvitesCount = computed(() => invites.value.filter(invite => invite.status === 'active').length)
const disabledUsersCount = computed(() => users.value.filter(user => user.status === 'disabled').length)

function assignSettings(next: SiteSettings) {
  Object.assign(settings, next)
}

function formatDate(value?: string | null) {
  if (!value) {
    return '暂无'
  }
  return new Date(value).toLocaleString('zh-CN')
}

function formatDuration(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function simplifyUserAgent(value: string) {
  if (!value) {
    return '未知设备'
  }

  if (value.length <= 72) {
    return value
  }

  return `${value.slice(0, 72)}...`
}

function buildInviteUrl(code: string) {
  return `${window.location.origin}/invite/${code}`
}

function resetPasswordInputs() {
  resetPasswordForm.password = ''
  resetPasswordForm.confirmPassword = ''
}

async function loadUserDetails(userId: string) {
  selectedUserDetails.value = await adminService.getUserDetails(userId, {
    loginPage: loginPage.value,
    loginPageSize: detailPageSize,
    watchPage: watchPage.value,
    watchPageSize: detailPageSize
  })
  selectedUserId.value = userId
  accessReason.value = selectedUserDetails.value.user.disabledReason || ''
  resetPasswordInputs()
}

async function selectUser(userId: string) {
  try {
    loginPage.value = 1
    watchPage.value = 1
    await loadUserDetails(userId)
  } catch (err: any) {
    uiStore.showNotification(err.message || '加载账号详情失败', 'error')
  }
}

async function loadUsers() {
  const result = await adminService.getUsers({
    page: userPage.value,
    pageSize: userPageSize,
    keyword: userSearchKeyword.value || undefined,
    role: userRoleFilter.value,
    status: userStatusFilter.value
  })

  users.value = result.items
  userPagination.value = result.pagination
}

async function loadOverview() {
  loading.value = true

  try {
    const overview = await adminService.getOverview()
    assignSettings(overview.settings)
    authStore.applyPublicBootstrap(overview.settings)
    invites.value = overview.invites
    runtime.value = overview.runtime
    await loadUsers()

    const selectedExistsOnPage = users.value.some(user => user.id === selectedUserId.value)
    const nextUserId = selectedUserId.value && (selectedExistsOnPage || selectedUserDetails.value)
      ? selectedUserId.value
      : (users.value[0]?.id || '')

    if (nextUserId) {
      await loadUserDetails(nextUserId)
    } else {
      selectedUserDetails.value = null
      selectedUserId.value = ''
    }
  } catch (err: any) {
    uiStore.showNotification(err.message || '加载管理台失败', 'error')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  savingSettings.value = true
  try {
    const saved = await adminService.updateSettings(settings)
    assignSettings(saved)
    authStore.applyPublicBootstrap(saved)
    document.title = `${String(route.meta.title || '站点管理')} - ${saved.siteName || 'Anime'}`
    uiStore.showNotification('站点设置已保存', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '保存设置失败', 'error')
  } finally {
    savingSettings.value = false
  }
}

async function createInvite() {
  creatingInvite.value = true
  try {
    const invite = await adminService.createInvite(newInvite)
    latestInviteUrl.value = buildInviteUrl(invite.code)
    newInvite.note = ''
    await loadOverview()
    uiStore.showNotification('邀请码已生成', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '生成邀请码失败', 'error')
  } finally {
    creatingInvite.value = false
  }
}

async function revokeInvite(inviteId: string) {
  try {
    await adminService.revokeInvite(inviteId)
    await loadOverview()
    uiStore.showNotification('邀请码已撤销', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '撤销邀请码失败', 'error')
  }
}

async function copyInvite(code: string) {
  try {
    await copyTextToClipboard(buildInviteUrl(code))
    uiStore.showNotification('邀请链接已复制', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '复制邀请链接失败', 'error')
  }
}

async function copyInviteUrl() {
  if (!latestInviteUrl.value) {
    return
  }

  try {
    await copyTextToClipboard(latestInviteUrl.value)
    uiStore.showNotification('邀请链接已复制', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '复制邀请链接失败', 'error')
  }
}

async function updateUserAccess(disabled: boolean) {
  if (!selectedUserDetails.value) {
    return
  }

  savingAccess.value = true

  try {
    await adminService.updateUserAccess(selectedUserDetails.value.user.id, {
      disabled,
      disabledReason: accessReason.value
    })
    await loadOverview()
    uiStore.showNotification(disabled ? '账号已禁用' : '账号已恢复', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '更新账号状态失败', 'error')
  } finally {
    savingAccess.value = false
  }
}

async function updateUserRole(isAdmin: boolean) {
  if (!selectedUserDetails.value) {
    return
  }

  updatingRole.value = true

  try {
    await adminService.updateUserRole(selectedUserDetails.value.user.id, { isAdmin })
    await loadOverview()
    uiStore.showNotification(isAdmin ? '已提升为管理员' : '已降级为普通用户', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '更新账号角色失败', 'error')
  } finally {
    updatingRole.value = false
  }
}

async function resetUserPassword() {
  if (!selectedUserDetails.value) {
    return
  }

  if (selectedUserDetails.value.user.id === authStore.user?.id) {
    uiStore.showNotification('请前往账号安全页面修改当前登录账号的密码', 'error')
    return
  }

  if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
    uiStore.showNotification('两次输入的新密码不一致', 'error')
    return
  }

  const confirmed = window.confirm(
    `确认重置用户 ${selectedUserDetails.value.user.username} 的密码吗？该用户所有登录会话都会失效。`
  )

  if (!confirmed) {
    return
  }

  resettingPassword.value = true

  try {
    await adminService.resetUserPassword(selectedUserDetails.value.user.id, {
      password: resetPasswordForm.password
    })
    resetPasswordInputs()
    await loadOverview()
    uiStore.showNotification('密码已重置，旧会话已失效', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '重置密码失败', 'error')
  } finally {
    resettingPassword.value = false
  }
}

async function changeUserPage(nextPage: number) {
  userPage.value = nextPage
  await loadOverview()
}

async function changeLoginPage(nextPage: number) {
  if (!selectedUserId.value) {
    return
  }

  loginPage.value = nextPage
  await loadUserDetails(selectedUserId.value)
}

async function changeWatchPage(nextPage: number) {
  if (!selectedUserId.value) {
    return
  }

  watchPage.value = nextPage
  await loadUserDetails(selectedUserId.value)
}

async function applyUserSearch() {
  userSearchKeyword.value = userSearchDraft.value
  userPage.value = 1
  await loadOverview()
}

async function resetUserSearch() {
  userSearchDraft.value = ''
  userSearchKeyword.value = ''
  userPage.value = 1
  await loadOverview()
}

async function applyRoleFilter(value: 'all' | 'admin' | 'user') {
  userRoleFilter.value = value
  userPage.value = 1
  await loadOverview()
}

async function applyStatusFilter(value: 'all' | 'active' | 'disabled') {
  userStatusFilter.value = value
  userPage.value = 1
  await loadOverview()
}

async function downloadDatabaseBackup() {
  downloadingBackup.value = true

  try {
    const blob = await adminService.downloadDatabaseBackup()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `anime-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.sqlite`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    uiStore.showNotification('数据库备份已开始下载', 'success')
  } catch (err: any) {
    uiStore.showNotification(err.message || '下载数据库备份失败', 'error')
  } finally {
    downloadingBackup.value = false
  }
}

function openDatabaseRestorePicker() {
  databaseImportInput.value?.click()
}

async function handleDatabaseFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const confirmed = window.confirm(
    '导入数据库会直接覆盖当前站点数据，并自动先生成一份导入前备份。确认继续吗？'
  )

  if (!confirmed) {
    input.value = ''
    return
  }

  restoringBackup.value = true

  try {
    const result = await adminService.restoreDatabaseBackup(file)
    uiStore.showNotification(
      `数据库已导入，页面即将刷新。导入前备份：${result.preImportBackupFileName}`,
      'success'
    )

    window.setTimeout(() => {
      window.location.reload()
    }, 1200)
  } catch (err: any) {
    uiStore.showNotification(err.message || '导入数据库备份失败', 'error')
  } finally {
    restoringBackup.value = false
    input.value = ''
  }
}

onMounted(async () => {
  uiStore.loadDarkModePreference()
  await loadOverview()
})
</script>

<style scoped>
.admin-view {
  --admin-panel-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 251, 0.98));
  --admin-hero-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(240, 244, 248, 0.98));
  --admin-card-bg: rgba(255, 255, 255, 0.82);
  --admin-border: rgba(44, 62, 80, 0.1);
  --admin-border-strong: rgba(44, 62, 80, 0.12);
  --admin-text: #15202b;
  --admin-heading: #0f1720;
  --admin-muted: #546170;
  --admin-soft: #708093;
  --admin-kicker: #8b5e34;
  --admin-input-bg: rgba(255, 255, 255, 0.96);
  --admin-shadow: 0 18px 44px rgba(15, 23, 32, 0.08);
  --admin-accent-shadow: 0 14px 30px rgba(202, 124, 45, 0.22);
  --admin-active-border: rgba(203, 128, 42, 0.38);
  --admin-active-shadow: 0 12px 26px rgba(35, 51, 68, 0.12);
  min-height: 100vh;
  padding-inline: clamp(0.5rem, 1.4vw, 1.1rem);
  color: var(--admin-text);
}

.admin-layout {
  width: min(100%, 1720px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-block: 1rem 2rem;
}

.admin-view.theme-light {
  background:
    radial-gradient(circle at top right, rgba(217, 228, 241, 0.5), transparent 24%),
    linear-gradient(180deg, rgba(249, 251, 253, 0.98), rgba(238, 243, 248, 0.98));
}

.admin-view.theme-dark {
  --admin-panel-bg: linear-gradient(180deg, rgba(34, 39, 49, 0.96), rgba(24, 28, 36, 0.98));
  --admin-hero-bg: linear-gradient(145deg, rgba(36, 42, 53, 0.98), rgba(24, 29, 38, 0.98));
  --admin-card-bg: rgba(255, 255, 255, 0.04);
  --admin-border: rgba(255, 255, 255, 0.08);
  --admin-border-strong: rgba(255, 255, 255, 0.1);
  --admin-text: #f4eee5;
  --admin-heading: #fff7ef;
  --admin-muted: #cab9a5;
  --admin-soft: #ad9981;
  --admin-kicker: #d8af7c;
  --admin-input-bg: rgba(255, 255, 255, 0.06);
  --admin-shadow: 0 22px 58px rgba(0, 0, 0, 0.34);
  --admin-accent-shadow: 0 16px 32px rgba(221, 143, 54, 0.2);
  --admin-active-border: rgba(237, 171, 89, 0.42);
  --admin-active-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
}

.admin-view.theme-dark {
  background:
    radial-gradient(circle at top right, rgba(214, 129, 42, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(13, 17, 23, 0.98), rgba(16, 21, 29, 0.98));
}

.admin-hero,
.panel,
.stat-card {
  border-radius: 1.55rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-panel-bg);
  box-shadow: var(--admin-shadow);
}

.admin-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-end;
  padding: 1.9rem;
  background:
    radial-gradient(circle at top right, rgba(211, 139, 72, 0.2), transparent 26%),
    var(--admin-hero-bg);
}

.hero-copy {
  max-width: 42rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.eyebrow,
.panel-eyebrow {
  margin: 0 0 0.55rem;
  font-size: 0.76rem;
  letter-spacing: 0.22rem;
  text-transform: uppercase;
  color: var(--admin-kicker);
}

.admin-hero h1,
.panel-header h2,
.empty-selection h2 {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
}

.admin-hero h1 {
  font-size: clamp(2.2rem, 4vw, 3.4rem);
}

.admin-hero p,
.empty-selection p,
.access-text,
.detail-item p,
.detail-item small {
  color: var(--admin-muted);
  line-height: 1.65;
}

.refresh-button,
.secondary-button,
.primary-button,
.danger-button,
.ghost-button,
.copy-button {
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1.15rem;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.hidden-file-input {
  display: none;
}

.refresh-button,
.primary-button {
  background: linear-gradient(135deg, #ca7c2d, #f0b160);
  color: #241405;
  box-shadow: var(--admin-accent-shadow);
}

.secondary-button {
  background: var(--admin-card-bg);
  color: var(--admin-heading);
  border: 1px solid var(--admin-border-strong);
}

.danger-button {
  background: linear-gradient(135deg, #b6483a, #d86f5a);
  color: #fff6f3;
}

.ghost-button,
.copy-button {
  background: var(--admin-card-bg);
  color: var(--admin-heading);
  border: 1px solid var(--admin-border-strong);
}

.ghost-button.danger {
  color: #a33b30;
}

.refresh-button:hover,
.primary-button:hover,
.danger-button:hover,
.ghost-button:hover,
.copy-button:hover {
  transform: translateY(-1px);
}

.refresh-button:disabled,
.primary-button:disabled,
.danger-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.2rem 1.3rem;
}

.stat-card span,
.detail-summary-grid span,
.runtime-grid span,
.invite-summary span {
  display: block;
  font-size: 0.8rem;
  color: var(--admin-soft);
  margin-bottom: 0.45rem;
}

.stat-card strong,
.detail-summary-grid strong,
.runtime-grid strong {
  font-size: 1.25rem;
  color: var(--admin-text);
}

.dashboard-grid,
.secondary-grid,
.detail-columns,
.runtime-grid {
  display: grid;
  gap: 1.5rem;
}

.dashboard-grid {
  grid-template-columns: 380px minmax(0, 1fr);
}

.secondary-grid {
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.95fr);
}

.detail-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.runtime-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.panel {
  padding: 1.4rem;
}

.panel-header,
.detail-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.panel-header {
  margin-bottom: 1rem;
}

.panel-meta {
  color: var(--admin-soft);
  font-size: 0.92rem;
}

.panel-note {
  margin: 0 0 1rem;
  color: var(--admin-muted);
  line-height: 1.6;
}

.user-list,
.detail-list,
.invite-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.user-search,
.pagination-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.filter-chip {
  border: 1px solid var(--admin-border-strong);
  background: var(--admin-card-bg);
  color: var(--admin-heading);
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.filter-chip.active {
  border-color: var(--admin-active-border);
  box-shadow: var(--admin-active-shadow);
}

.user-search {
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
  min-width: 0;
  border-radius: 999px;
  border: 1px solid var(--admin-border-strong);
  background: var(--admin-input-bg);
  color: var(--admin-text);
  padding: 0.85rem 1rem;
}

.search-input:focus {
  outline: none;
  border-color: rgba(202, 124, 45, 0.52);
  box-shadow: 0 0 0 4px rgba(202, 124, 45, 0.12);
}

.user-card,
.detail-item,
.invite-item,
.access-card,
.detail-summary-grid article,
.invite-link-box {
  border-radius: 1.15rem;
  border: 1px solid var(--admin-border-strong);
  background: var(--admin-card-bg);
}

.user-card {
  width: 100%;
  padding: 1rem;
  text-align: left;
  cursor: pointer;
}

.user-card.active {
  border-color: var(--admin-active-border);
  box-shadow: var(--admin-active-shadow);
}

.user-card-top,
.detail-item-head,
.invite-item,
.invite-actions,
.user-card-subline {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.user-card-top strong,
.detail-item-head strong {
  color: var(--admin-heading);
}

.user-badge,
.invite-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.5rem;
  border-radius: 999px;
  padding: 0.28rem 0.68rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-active {
  background: rgba(79, 171, 106, 0.16);
  color: #2e7b46;
}

.status-disabled,
.status-revoked,
.status-expired {
  background: rgba(188, 74, 59, 0.14);
  color: #a53f31;
}

.status-used {
  background: rgba(102, 93, 175, 0.12);
  color: #5b51a8;
}

.user-card-subline,
.detail-item-head span,
.detail-item small,
.invite-meta small {
  font-size: 0.88rem;
  color: var(--admin-soft);
}

.user-card-subline.dim {
  margin-top: 0.35rem;
}

.detail-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
  margin-bottom: 1rem;
}

.detail-summary-grid article,
.detail-item,
.invite-item,
.invite-link-box,
.access-card {
  padding: 1rem;
}

.access-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 1rem;
  margin-bottom: 1rem;
}

.access-title {
  margin: 0 0 0.4rem;
  font-weight: 700;
  color: var(--admin-heading);
}

.access-actions {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.password-reset-grid {
  display: grid;
  gap: 0.8rem;
}

.reason-input,
.field input,
.field textarea {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid var(--admin-border-strong);
  background: var(--admin-input-bg);
  color: var(--admin-text);
  padding: 0.9rem 1rem;
}

.reason-input:focus,
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: rgba(202, 124, 45, 0.52);
  box-shadow: 0 0 0 4px rgba(202, 124, 45, 0.12);
}

.notice-banner,
.empty-tip {
  border-radius: 1rem;
  padding: 0.95rem 1rem;
  background: rgba(186, 72, 58, 0.1);
  color: #9e4133;
}

.notice-banner a {
  color: inherit;
  font-weight: 700;
}

.empty-tip {
  margin: 0;
  background: var(--admin-card-bg);
  color: var(--admin-soft);
}

.pagination-bar {
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.pagination-info {
  color: var(--admin-soft);
  font-size: 0.9rem;
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-panel h3 {
  margin: 0;
  color: var(--admin-heading);
}

.tone-success {
  color: #2f7f48;
}

.tone-danger {
  color: #aa4638;
}

.empty-selection {
  min-height: 420px;
  display: grid;
  place-items: center;
  text-align: center;
}

.settings-form,
.invite-creator {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field span {
  font-size: 0.9rem;
  color: var(--admin-muted);
}

.switch-row {
  display: inline-flex;
  gap: 0.7rem;
  align-items: center;
  color: var(--admin-muted);
}

.invite-link-box code,
.mono {
  font-family: 'SFMono-Regular', 'Menlo', 'Monaco', monospace;
  word-break: break-all;
}

@media (max-width: 1200px) {
  .dashboard-grid,
  .secondary-grid,
  .detail-columns,
  .runtime-grid,
  .stats-grid,
  .detail-summary-grid,
  .access-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .admin-view {
    padding-inline: 0.65rem;
  }

  .admin-layout {
    padding-block: 0.85rem 1.25rem;
  }

  .admin-hero,
  .panel-header,
  .detail-panel-header,
  .invite-item,
  .detail-item-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .user-search,
  .pagination-bar,
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
