import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '动画列表' }
  },
  {
    path: '/watch/:animeId',
    name: 'Watch',
    component: () => import('@/views/WatchView.vue'),
    props: true,
    meta: { title: '播放视频' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { title: '观看历史' }
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

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  document.title = title ? `${title} - 动画` : '动画'
  next()
})

export default router
