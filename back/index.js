const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.use(cors());
app.use(express.json());

// 简单的内存用户存储（示例）
// 生产中应使用数据库。这里预置一个用户：username: admin, password: 123456
const users = [
  {
    id: 1,
    username: 'admin',
    // 预生成的 bcrypt hash 对应明文 123456
    passwordHash: bcrypt.hashSync('123456', 10),
  },
];

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码必填' });
  }

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '2h',
  });

  res.json({ token, username: user.username });
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});


