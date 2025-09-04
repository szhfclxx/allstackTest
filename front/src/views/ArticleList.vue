<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const list = ref([])
const loading = ref(false)
const errorMsg = ref('')

const username = computed(() => localStorage.getItem('username') || '')
const isAuthed = computed(() => !!localStorage.getItem('token'))

const fetchList = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await axios.get('/api/articles')
    list.value = Array.isArray(res.data) ? res.data : []
    console.log('[articles] fetched', list.value.length)
  } catch (e) {
    console.error('[articles] fetch error', e)
    errorMsg.value = e?.response?.data?.message || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const goDetail = (id) => {
  if (!id) return
  router.push({ name: 'article-detail', params: { id } }).catch(() => {})
}

const createSample = async () => {
  try {
    await axios.post('/api/articles', {
      title: '示例文章',
      content: '<p>这是一篇示例文章内容</p>',
      status: 'PUBLISHED',
    })
    await fetchList()
    alert('已创建示例文章')
  } catch (e) {
    alert(e?.response?.data?.message || '创建失败，请先登录')
  }
}

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="list-page">
    <div class="header">
      <h2>文章列表</h2>
      <div class="actions">
        <router-link v-if="username" to="/editor">写文章</router-link>
        <button class="btn" @click="fetchList">刷新列表</button>
      </div>
    </div>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <div v-if="loading">加载中...</div>
    <div v-else-if="list.length === 0" class="empty">
      <p>暂无已发布文章。</p>
      <router-link v-if="isAuthed" to="/editor">去发布第一篇文章</router-link>
      <router-link v-else to="/login">登录后发布第一篇文章</router-link>
    </div>
    <div v-else class="grid">
      <div v-for="a in list" :key="a.id" class="card" @click="goDetail(a.id)">
        <img v-if="a.coverUrl" :src="a.coverUrl" alt="cover" />
        <h3>{{ a.title }}</h3>
        <p class="meta">作者：{{ a.author?.username || '佚名' }} · {{ new Date(a.createdAt).toLocaleString() }}</p>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.list-page { max-width: 960px; margin: 24px auto; padding: 0 16px; }
.header { display: flex; align-items: center; justify-content: space-between; }
.actions { display: flex; gap: 10px; align-items: center; }
.btn { height: 28px; padding: 0 10px; border: 1px solid #ddd; background: #f7f7f7; border-radius: 4px; cursor: pointer; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 16px; }
.card { border: 1px solid #eee; border-radius: 8px; padding: 12px; cursor: pointer; transition: box-shadow .2s; }
.card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
.card img { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; margin-bottom: 8px; }
.meta { color: #666; font-size: 12px; }
.empty { margin-top: 20px; color: #666; }
.error { color: #d93025; }
</style>


