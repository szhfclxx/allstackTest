import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Home from '../views/Home.vue'
import ArticleList from '../views/ArticleList.vue'
import ArticleDetail from '../views/ArticleDetail.vue'
import ArticleEdit from '../views/ArticleEdit.vue'
import MyArticles from '../views/MyArticles.vue'

const routes = [
  { path: '/', name: 'home', component: Home, meta: { requiresAuth: true } },
  { path: '/articles', name: 'articles', component: ArticleList },
  { path: '/articles/:id', name: 'article-detail', component: ArticleDetail },
  { path: '/editor/:id?', name: 'article-edit', component: ArticleEdit, meta: { requiresAuth: true } },
  { path: '/mine', name: 'my-articles', component: MyArticles, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta?.requiresAuth && !token) {
    next({ name: 'login' })
    return
  }
  if (to.meta?.guestOnly && token) {
    next({ name: 'home' })
    return
  }
  next()
})

export default router


