# 部署指南

本项目为 pnpm monorepo：`apps/server`（NestJS 10 API，端口 3001）+ `apps/web`（React/Vite 前端）+ `packages/shared`（共享 Schema）。

## 架构与持久化

- **SQLite（better-sqlite3）**：server 启动时在 `apps/server/data/courseware.db` 建库（WAL 模式），持久化课件、文档与 AI token 用量日志（`usage_logs` 表）。
- **Docker 中必须挂 volume**：容器内路径 `/app/apps/server/data`（见 `docker-compose.yml`，已配置 named volume `courseware-data`），否则容器重建即丢数据。`generated/`（课件素材）与 `uploads/`（原始文档）同理，已分别挂载。
- 首次启动会自动把旧版 `generated/coursewares/*.json` 一次性导入 SQLite，导入成功的文件改名为 `*.json.migrated`。

## 本地开发

```bash
export PATH="/c/nvm4w/nodejs:$PATH"   # Windows Git Bash，node 22
pnpm install
pnpm --filter @courseware/shared build
pnpm --filter @courseware/server dev   # API: http://localhost:3001/api
pnpm --filter @courseware/web dev      # Web: vite dev server
```

AI 密钥通过环境变量注入（server 读取 `apps/server/.env` 或上级目录 `.env`）：

```
ARK_API_KEY=your-key
ARK_API_BASE=https://ark.cn-beijing.volces.com/api/v3
SERVER_PORT=3001
```

## Docker 部署

```bash
# 根目录 .env 写入 ARK_API_KEY / ARK_API_BASE（compose 变量替换用）
docker compose up -d --build
```

- Web：http://localhost:8080 （nginx 托管 `apps/web/dist`，`/api/*` 反代到 server）
- API：http://localhost:3001/api （端口直接暴露，便于调试）
- 用量统计：http://localhost:8080/api/admin/usage （今日/累计 token、缓存命中率、按 model 分组）

单独构建镜像：

```bash
docker build -t courseware-server .                       # server（根 Dockerfile）
docker build -t courseware-web -f apps/web/Dockerfile .   # web
docker run -d -p 3001:3001 \
  -e ARK_API_KEY=... -e ARK_API_BASE=... \
  -v courseware-data:/app/apps/server/data \
  courseware-server
```

## 运维说明

- **备份**：备份 volume 中的 `courseware.db`（WAL 模式下建议先 checkpoint 或直接整目录拷贝 `data/`）。
- **用量日志**：每次 AI 调用（含失败，caller 带 `error:` 前缀）写一行 `usage_logs`，可用 SQL 直接审计。
- **前端 API 地址**：前端部分页面硬编码 `http://localhost:3001/api`，因此 compose 将 server 的 3001 端口发布到宿主机；相对路径 `/api` 的请求则由 nginx 代理。如需对外部署到非 localhost 域名，需调整前端 API_BASE 或统一走 `/api`。
