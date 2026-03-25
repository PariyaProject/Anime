import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '账号登录', requiresAuth: false, publicOnly: true, hideAppChrome: true }
  },
  {
    path: '/invite/:code',
    name: 'AcceptInvite',
    component: () => import('@/views/AcceptInviteView.vue'),
    meta: { title: '受邀注册', requiresAuth: false, publicOnly: true, hideAppChrome: true }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '动画列表', requiresAuth: true }
  },
  {
    path: '/anime/:animeId',
    name: 'AnimeDetail',
    component: () => import('@/views/DetailView.vue'),
    meta: { title: '动画详情', requiresAuth: true }
  },
  {
    path: '/watch/:animeId',
    name: 'Watch',
    component: () => import('@/views/WatchView.vue'),
    meta: { title: '播放视频', requiresAuth: true }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { title: '观看历史', requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { title: '站点管理', requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 如果有保存的位置（例如浏览器后退），返回到该位置
    if (savedPosition) {
      return savedPosition
    }
    // 否则，总是滚动到顶部
    return { top: 0, left: 0 }
  }
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)
  await authStore.initialize()

  const title = to.meta.title as string
  const siteName = authStore.publicBootstrap?.siteName || 'Anime'
  document.title = to.meta.hideAppChrome
    ? siteName
    : (title ? `${title} - ${siteName}` : siteName)

  const requiresAuth = to.meta.requiresAuth !== false
  const publicOnly = Boolean(to.meta.publicOnly)
  const requiresAdmin = Boolean(to.meta.requiresAdmin)

  if (requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'Login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {}
    }
  }

  if (publicOnly && authStore.isAuthenticated) {
    return { name: authStore.user?.isAdmin ? 'Admin' : 'Home' }
  }

  if (requiresAdmin && !authStore.user?.isAdmin) {
    return { name: 'Home' }
  }

  return true
})

export default router
