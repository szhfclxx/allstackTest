<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = computed(() => localStorage.getItem('username') || '')

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}
</script>

<template>
  <div class="home">
    <h2>欢迎 {{ username || '游客' }}</h2>
    <p>这是一个示例首页。你已成功搭建前后端并可登录。</p>
    <div class="actions">
      <router-link to="/login">前往登录</router-link>
      <button @click="logout">退出登录</button>
    </div>
  </div>
  
</template>

<style scoped>
.home { max-width: 720px; margin: 40px auto; padding: 0 16px; }
.actions { margin-top: 16px; display: flex; gap: 12px; align-items: center; }
button { height: 32px; padding: 0 12px; background: #e53935; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
</style>


