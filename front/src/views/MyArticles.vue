<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const list = ref([])
const loading = ref(false)
const errorMsg = ref('')

const fetchMine = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/my-articles')
    list.value = res.data || []
  } catch (e) {
    errorMsg.value = e?.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const publish = async (id) => {
  try {
    await axios.put(`/api/articles/${id}`, { status: 'PUBLISHED' })
    await fetchMine()
  } catch (e) {
    alert(e?.response?.data?.message || '操作失败')
  }
}

const unpublish = async (id) => {
  try {
    await axios.put(`/api/articles/${id}`, { status: 'DRAFT' })
    await fetchMine()
  } catch (e) {
    alert(e?.response?.data?.message || '操作失败')
  }
}

const remove = async (id) => {
  if (!confirm('确认删除该文章？')) return
  try {
    await axios.delete(`/api/articles/${id}`)
    await fetchMine()
  } catch (e) {
    alert(e?.response?.data?.message || '删除失败')
  }
}

onMounted(fetchMine)
</script>

<template>
  <div class="mine-page">
    <div class="header">
      <h2>我的文章</h2>
      <router-link to="/editor">新建</router-link>
    </div>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    <div v-if="loading">加载中...</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in list" :key="a.id">
          <td>{{ a.id }}</td>
          <td>
            <router-link :to="{ name: 'article-detail', params: { id: a.id } }">{{ a.title }}</router-link>
          </td>
          <td>{{ a.status }}</td>
          <td>{{ new Date(a.createdAt).toLocaleString() }}</td>
          <td class="ops">
            <router-link :to="{ name: 'article-edit', params: { id: a.id } }">编辑</router-link>
            <button v-if="a.status === 'DRAFT'" @click="publish(a.id)">发布</button>
            <button v-else @click="unpublish(a.id)">撤回</button>
            <button @click="remove(a.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  
</template>

<style scoped>
.mine-page { max-width: 960px; margin: 24px auto; padding: 0 16px; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #eee; padding: 8px; text-align: left; }
.ops { display: flex; gap: 8px; }
.error { color: #d93025; }
</style>


