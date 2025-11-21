# 🤖 AmIAI · Run & Stop Guide

本项目包含 React 前端、Node.js 游戏后端以及 Python AI 服务。下面的步骤只关注“如何启动项目”和“如何优雅停止项目”。

---

## 🚀 启动项目

> 前置需要：Docker/Docker Compose（推荐）, 或者本地安装 Node.js 18+、Python 3.10+、Redis。

### 方式一：一键启动（推荐）

```bash
# 1. 在仓库根目录设置可选的 OpenAI API Key
echo "OPENAI_API_KEY=sk-your-key" > .env

# 2. 构建并启动所有服务
docker compose up --build

# 3. 打开浏览器访问前端
open http://localhost:3000   # macOS
# xdg-open http://localhost:3000  # Linux
# 或者直接复制链接到浏览器
```

### 方式二：分别启动

```bash
# AI 服务
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 后端
cd ../backend
npm install
npm run dev   # 默认监听 4000 端口

# 前端
cd ../frontend
npm install
npm run dev   # 默认监听 3000 端口
```

---

## 🛑 停止项目

### 如果用 Docker Compose 启动

```bash
# 停止并移除容器（数据卷保留）
docker compose down

# 若想连带 Redis 数据一起清空
docker compose down -v
```

### 如果分别启动

1. 在每个终端窗口按下 `Ctrl+C` 停止 `npm run dev` / `uvicorn` / `redis-server`。
2. 如有后台进程，使用 `ps` + `kill <pid>` 清理即可。

---

## 📌 运行检查清单

- 前端：`http://localhost:3000` 可以访问大厅并选择模型。
- 后端：`http://localhost:4000/health` 返回 `{"status":"healthy"}`。
- AI 服务：`http://localhost:8000/` 返回当前模型信息。
- Redis：确认 `docker ps` 中包含 `redis:7-alpine`（或本地 Redis 服务已启动）。

当以上检查都通过时，即可开始匹配或体验“一字识AI”玩法。祝玩得开心！
