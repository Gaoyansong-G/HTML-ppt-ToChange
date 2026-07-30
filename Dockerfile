# syntax=docker/dockerfile:1
# ==============================================================================
# Courseware Agent - API server (apps/server) 生产镜像
#
# pnpm workspace 构建：packages/shared -> apps/server (NestJS)
# 持久化：better-sqlite3，数据库文件默认位于容器内 /app/apps/server/data/courseware.db
#   => 运行时务必将该目录挂载为 volume（见 docker-compose.yml），否则容器重建即丢数据。
# ==============================================================================

# ---------- 依赖安装阶段 ----------
FROM node:22-alpine AS deps
WORKDIR /app

# pnpm 版本与根 package.json 的 packageManager 字段保持一致
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# better-sqlite3 是原生模块：alpine(musl) 无官方预编译产物时需源码编译，
# 因此本阶段安装 python3/make/g++（仅构建期需要，不带入最终镜像）
RUN apk add --no-cache python3 make g++

# 仅拷贝依赖清单，最大化利用 Docker layer 缓存
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json

# --filter @courseware/server... 安装 server 及其 workspace 依赖（含 shared）
RUN pnpm install --frozen-lockfile --filter @courseware/server...

# ---------- 构建阶段 ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# 先构建 shared（server 依赖其 dist 产物），再构建 server
RUN pnpm --filter @courseware/shared build \
 && pnpm --filter @courseware/server build

# ---------- 运行阶段 ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist

# SQLite 数据目录（挂载 volume 到此处以持久化 courseware.db / WAL 文件）
# 注意：generated/ 与 uploads/ 如需跨容器保留，也应一并挂载
RUN mkdir -p /app/apps/server/data /app/apps/server/generated /app/apps/server/uploads

WORKDIR /app/apps/server
EXPOSE 3001

# 通过环境变量注入：SERVER_PORT / ARK_API_KEY / ARK_API_BASE 等（见 .env.example）
CMD ["node", "dist/main"]
