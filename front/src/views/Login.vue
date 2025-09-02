<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const router = useRouter()

const submit = async () => {
  errorMsg.value = ''
  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    const res = await axios.post('/api/login', {
      username: username.value,
      password: password.value,
    })
    const { token, username: name } = res.data || {}
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('username', name)
      router.push('/')
    } else {
      errorMsg.value = '登录失败'
    }
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper">
    <h1>登录</h1>
    <form @submit.prevent="submit">
      <div class="form-item">
        <label>用户名</label>
        <input v-model="username" placeholder="请输入用户名" />
      </div>
      <div class="form-item">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码" />
      </div>
      <div class="form-item">
        <button type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
      </div>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <p class="tip">预置账号：admin / 123456</p>
    </form>
  </div>
  
</template>

<style scoped>
.login-wrapper { max-width: 360px; margin: 80px auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px; }
.form-item { margin-bottom: 16px; display: flex; flex-direction: column; }
label { margin-bottom: 6px; font-size: 14px; color: #333; }
input { height: 36px; padding: 0 10px; border: 1px solid #ddd; border-radius: 4px; }
button { width: 100%; height: 36px; background: #42b883; color: white; border: none; border-radius: 4px; cursor: pointer; }
button:disabled { opacity: .6; cursor: not-allowed; }
.error { color: #d93025; font-size: 13px; }
.tip { color: #666; font-size: 12px; }
</style>


