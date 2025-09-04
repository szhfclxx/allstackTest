const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PrismaClient, ArticleStatus } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.use(cors());
app.use(express.json());

// 提供静态资源访问（上传目录）
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));

// 确保数据目录存在
const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 初始化 PrismaClient
const prisma = new PrismaClient();

// 启动时确保预置管理员账号存在：admin / 123456
async function ensureAdminUser() {
  try {
    const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!existing) {
      const hash = bcrypt.hashSync('123456', 10);
      await prisma.user.create({ data: { username: 'admin', passwordHash: hash } });
      console.log('已创建预置管理员账号：admin / 123456');
    }
  } catch (e) {
    console.error('预置管理员账号失败：', e);
  }
}
ensureAdminUser();

// 简单鉴权中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: '未授权' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: '令牌无效或已过期' });
  }
}

// 文章 CRUD
app.post('/api/articles', authMiddleware, async (req, res) => {
  const { title, content, status, coverUrl } = req.body || {};
  if (!title) return res.status(400).json({ message: '标题必填' });
  if (!content) return res.status(400).json({ message: '内容必填' });
  const normalizedStatus = (status === 'PUBLISHED') ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;
  try {
    const article = await prisma.article.create({
      data: {
        title,
        content,
        status: normalizedStatus,
        coverUrl: coverUrl || null,
        authorId: req.user.userId,
      },
    });
    res.json(article);
  } catch (e) {
    console.error('创建文章失败: ', e);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 查询已发布文章列表（倒序）
app.get('/api/articles', async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, coverUrl: true, createdAt: true, updatedAt: true, author: { select: { username: true } } },
    });
    res.json(articles);
  } catch (e) {
    console.error('获取文章列表失败: ', e);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 草稿/我的文章列表（需要登录，可见自己所有状态）
app.get('/api/my-articles', authMiddleware, async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      where: { authorId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(articles);
  } catch (e) {
    console.error('获取我的文章失败: ', e);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 文章详情（仅发布的可公开访问；草稿仅作者可见）
app.get('/api/articles/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: '参数错误' });
  try {
    const article = await prisma.article.findUnique({ where: { id }, include: { author: { select: { username: true } } } });
    if (!article) return res.status(404).json({ message: '未找到' });
    if (article.status === ArticleStatus.DRAFT) {
      // 验证是否本人
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      try {
        const payload = token ? jwt.verify(token, JWT_SECRET) : null;
        if (!payload || payload.userId !== article.authorId) {
          return res.status(403).json({ message: '无权访问草稿' });
        }
      } catch (e) {
        return res.status(403).json({ message: '无权访问草稿' });
      }
    }
    res.json(article);
  } catch (e) {
    console.error('获取文章详情失败: ', e);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新文章（仅作者）
app.put('/api/articles/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { title, content, status, coverUrl } = req.body || {};
  if (!Number.isFinite(id)) return res.status(400).json({ message: '参数错误' });
  try {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '未找到' });
    if (existing.authorId !== req.user.userId) return res.status(403).json({ message: '无权限' });
    const updated = await prisma.article.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        content: content ?? existing.content,
        status: status ? (status === 'PUBLISHED' ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT) : existing.status,
        coverUrl: coverUrl === undefined ? existing.coverUrl : coverUrl,
      },
    });
    res.json(updated);
  } catch (e) {
    console.error('更新文章失败: ', e);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除文章（仅作者）
app.delete('/api/articles/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: '参数错误' });
  try {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '未找到' });
    if (existing.authorId !== req.user.userId) return res.status(403).json({ message: '无权限' });
    await prisma.article.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('删除文章失败: ', e);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 上传：图片/视频
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    const name = `${Date.now()}_${base || 'file'}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: '未接收到文件' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码必填' });
  }

  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';

  try {
    // 查询用户
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      await prisma.loginLog.create({ data: { userId: null, username, success: false, ip, userAgent: ua } });
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await prisma.loginLog.create({ data: { userId: user.id, username, success: false, ip, userAgent: ua } });
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    await prisma.loginLog.create({ data: { userId: user.id, username, success: true, ip, userAgent: ua } });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '2h',
    });
    return res.json({ token, username: user.username });
  } catch (e) {
    console.error('登录错误: ', e);
    return res.status(500).json({ message: '服务器错误' });
  }
});

// 注册接口
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码必填' });
  }

  try {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return res.status(409).json({ message: '用户名已被占用' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({ data: { username, passwordHash } });

    // 记录注册成功可视为一次成功登录
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    await prisma.loginLog.create({ data: { userId: user.id, username: user.username, success: true, ip, userAgent: ua } });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ token, username: user.username });
  } catch (e) {
    console.error('注册错误: ', e);
    return res.status(500).json({ message: '服务器错误' });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});


