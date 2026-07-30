# syntax=docker/dockerfile:1
# ==============================================================================
# Courseware Agent - 前端 (apps/web) 生产镜像
#
# 构建：node:22-alpine 上 pnpm 构建 packages/shared + apps/web (vite)
# 运行：nginx:alpine 托管 apps/web/dist 静态产物
#   - /api/* 反向代理到 compose 网络内的 server 服务（见 nginx.conf）
#   - SPA 路由 fallback 到 index.html
# ==============================================================================

# ---------- 依赖安装阶段 ----------
FROM node:22-alpine AS deps
WORKDIR /app

# pnpm 版本与根 package.json 的 packageManager 字段保持一致
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# 仅拷贝依赖清单，最大化利用 Docker layer 缓存
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json

# --filter @courseware/web... 安装 web 及其 workspace 依赖（含 shared）
RUN pnpm install --frozen-lockfile --filter @courseware/web...

# ---------- 构建阶段 ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# 先构建 shared（web 依赖其 dist 产物），再构建 web（tsc 类型检查 + vite build）
RUN pnpm --filter @courseware/shared build \
 && pnpm --filter @courseware/web build

# ---------- 运行阶段 ----------
FROM nginx:alpine AS runtime

# SPA fallback + /api 反向代理配置
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
