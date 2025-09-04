<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const article = ref(null)
const loading = ref(false)
const errorMsg = ref('')

const hasHtml = computed(() => {
  const c = article.value?.content || ''
  return /<[^>]+>/.test(c)
})

const currentUsername = computed(() => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? (window.localStorage.getItem('username') || '') : ''
  } catch {
    return ''
  }
})

onMounted(async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/articles/${id}`)
    article.value = res.data
  } catch (e) {
    errorMsg.value = e?.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
})

const remove = async () => {
  if (!confirm('确认删除该文章？')) return
  try {
    await axios.delete(`/api/articles/${id}`)
    router.push({ name: 'articles' })
  } catch (e) {
    alert(e?.response?.data?.message || '删除失败')
  }
}
</script>

<template>
  <div class="detail-page" v-if="!loading">
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <div v-else-if="article">
      <h1>{{ article.title }}</h1>
      <p class="meta">作者：{{ article.author?.username || '佚名' }} · {{ new Date(article.createdAt).toLocaleString() }}</p>
      <img v-if="article.coverUrl" :src="article.coverUrl" class="cover" alt="cover" />
      <div v-if="hasHtml" class="content" v-html="article.content"></div>
      <pre v-else class="content-plain">{{ article.content }}</pre>
      <div class="actions">
        <router-link v-if="currentUsername === article.author?.username" :to="{ name: 'article-edit', params: { id: article.id } }">编辑</router-link>
        <button v-if="currentUsername === article.author?.username" @click="remove">删除</button>
        <router-link to="/articles">返回列表</router-link>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.detail-page { max-width: 880px; margin: 24px auto; padding: 0 16px; }
.meta { color: #666; font-size: 12px; margin-top: -8px; margin-bottom: 12px; }
.cover { width: 100%; max-height: 380px; object-fit: cover; border-radius: 8px; margin: 8px 0; }
.content :deep(pre) { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow: auto; }
.content :deep(img) { max-width: 100%; border-radius: 6px; }
.actions { display: flex; gap: 12px; align-items: center; margin-top: 16px; }
.error { color: #d93025; }
</style>


