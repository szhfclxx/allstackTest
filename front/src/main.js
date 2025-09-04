import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import axios from 'axios'

// 全局 Axios：自动带上 token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// 请求超时
axios.defaults.timeout = 10000

createApp(App).use(router).mount('#app')
