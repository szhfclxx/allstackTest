<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id)

const title = ref('')
const content = ref('')
const status = ref('DRAFT')
const coverUrl = ref('')
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  if (id.value) {
    loading.value = true
    try {
      const res = await axios.get(`/api/articles/${id.value}`)
      const a = res.data || {}
      title.value = a.title || ''
      content.value = a.content || ''
      status.value = a.status || 'DRAFT'
      coverUrl.value = a.coverUrl || ''
    } catch (e) {
      errorMsg.value = e?.response?.data?.message || '加载失败'
    } finally {
      loading.value = false
    }
  }
})

const onUpload = async (e, kind) => {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await axios.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    const url = res.data?.url
    if (url) {
      if (kind === 'image') {
        content.value += `\n<p><img src="${url}" alt="image" /></p>`
      } else if (kind === 'video') {
        content.value += `\n<p><video src="${url}" controls style="max-width:100%"></video></p>`
      }
    }
  } catch (e2) {
    alert(e2?.response?.data?.message || '上传失败')
  } finally {
    e.target.value = ''
  }
}

const insert = (tag) => {
  if (tag === 'h2') content.value += '\n<h2>二级标题</h2>'
  if (tag === 'bold') content.value += '<b>加粗文字</b>'
  if (tag === 'italic') content.value += '<i>斜体文字</i>'
  if (tag === 'code') content.value += '\n<pre><code>// 代码块</code></pre>'
  if (tag === 'ul') content.value += '\n<ul><li>项目1</li><li>项目2</li></ul>'
}

const save = async (publish = false) => {
  const html = content.value || ''
  const textOnly = html.replace(/<[^>]*>/g, '').trim()
  const hasMediaOrCode = /<(img|video|pre|code|iframe)\b/i.test(html)
  const contentValid = textOnly.length > 0 || hasMediaOrCode
  if (!title.value || !contentValid) {
    errorMsg.value = '标题和内容必填'
    return
  }
  saving.value = true
  try {
    const payload = {
      title: title.value,
      content: content.value,
      status: publish ? 'PUBLISHED' : status.value || 'DRAFT',
      coverUrl: coverUrl.value || null,
    }
    if (id.value) {
      await axios.put(`/api/articles/${id.value}`, payload)
    } else {
      const res = await axios.post('/api/articles', payload)
      if (!publish) router.replace({ name: 'article-edit', params: { id: res.data?.id } })
    }
    if (publish) {
      alert('发布成功')
      router.push({ name: 'articles' })
    } else {
      alert('草稿已保存')
    }
  } catch (e) {
    const statusCode = e?.response?.status
    if (statusCode === 401) {
      alert('登录已失效，请重新登录')
      router.push({ name: 'login' })
    } else {
      alert(e?.response?.data?.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="editor-page">
    <h2>{{ id ? '编辑文章' : '新建文章' }}</h2>
    <div class="form">
      <div class="form-item">
        <label>标题</label>
        <input v-model="title" placeholder="请输入标题" />
      </div>
      <div class="form-item">
        <label>封面地址（可选）</label>
        <input v-model="coverUrl" placeholder="/uploads/xxx.png 或网络地址" />
      </div>
      <div class="toolbar">
        <button @click="insert('h2')">H2</button>
        <button @click="insert('bold')">B</button>
        <button @click="insert('italic')"><i>I</i></button>
        <button @click="insert('code')">代码块</button>
        <button @click="insert('ul')">无序列表</button>
        <label class="upload">
          插入图片
          <input type="file" accept="image/*" @change="(e)=>onUpload(e,'image')" />
        </label>
        <label class="upload">
          插入视频
          <input type="file" accept="video/*" @change="(e)=>onUpload(e,'video')" />
        </label>
      </div>
      <div class="form-item">
        <label>内容（HTML）</label>
        <textarea v-model="content" class="ta" placeholder="支持基础 HTML，工具栏可快速插入常用结构"></textarea>
      </div>
      <div class="actions">
        <button :disabled="saving" @click="save(false)">{{ saving ? '保存中...' : '保存草稿' }}</button>
        <button :disabled="saving" class="primary" @click="save(true)">{{ saving ? '发布中...' : '发布' }}</button>
        <router-link to="/articles">返回列表</router-link>
      </div>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </div>
  </div>
  
</template>

<style scoped>
.editor-page { max-width: 960px; margin: 24px auto; padding: 0 16px; }
.form-item { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
input { height: 36px; padding: 0 10px; border: 1px solid #ddd; border-radius: 4px; }
.ta { min-height: 280px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 6px 0 10px; }
.toolbar .upload { position: relative; overflow: hidden; border: 1px solid #ddd; padding: 4px 8px; border-radius: 4px; cursor: pointer; background: #f7f7f7; }
.toolbar .upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.actions { display: flex; gap: 12px; align-items: center; margin-top: 8px; }
button { height: 32px; padding: 0 12px; border: 1px solid #ddd; background: #f7f7f7; border-radius: 4px; cursor: pointer; }
.primary { background: #42b883; color: #fff; border: none; }
.error { color: #d93025; }
</style>


