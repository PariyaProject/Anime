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
  routes
})

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  document.title = title ? `${title} - Cycani` : 'Cycani - 次元城动画'
  next()
})

export default router
