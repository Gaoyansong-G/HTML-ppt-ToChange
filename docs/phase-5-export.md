# 阶段 5：导出与项目包

> 阶段目标：支持保存可编辑项目包（`.courseware`）和导出独立播放包（`.html`），并提供后端课件/资源管理能力。

---

## 1. 完成内容

### 1.1 后端课件 CRUD 接口

- **文件**：
  - `apps/server/src/modules/courseware/courseware.controller.ts`
  - `apps/server/src/modules/courseware/courseware.service.ts`
  - `apps/server/src/modules/courseware/courseware.module.ts`
- **接口**：
  - `GET /api/courseware`：课件列表
  - `GET /api/courseware/:id`：课件详情
  - `POST /api/courseware`：创建课件（带 Zod Schema 校验）
  - `PUT /api/courseware/:id`：更新课件
  - `DELETE /api/courseware/:id`：删除课件
- 内存存储，开发期足够验证。

### 1.2 后端资源管理接口

- **文件**：
  - `apps/server/src/modules/assets/assets.controller.ts`
  - `apps/server/src/modules/assets/assets.service.ts`
  - `apps/server/src/modules/assets/assets.module.ts`
- **接口**：
  - `POST /api/assets/upload`：上传资源文件
  - `GET /api/assets/:id`：获取资源二进制
  - `DELETE /api/assets/:id`：删除资源
- 资源存储在 `generated/assets/`。

### 1.3 后端 .courseware 项目包导出

- **文件**：`apps/server/src/modules/courseware/courseware.service.ts`
- **接口**：`GET /api/courseware/:id/export/package`
- 返回 ZIP，包含 `courseware.json` + `assets/` 目录。
- 已接入 `AssetsService` 读取本地资源文件。

### 1.4 前端 .courseware 导出/导入

- **文件**：
  - `apps/web/src/lib/export.ts`
  - `apps/web/src/editor/Editor.tsx`
- **能力**：
  - 编辑器工具栏“导出”按钮：本地生成 ZIP，下载 `.courseware.zip`。
  - 编辑器工具栏“导入”按钮：选择 `.courseware.zip`，解压并校验 Schema，加载到编辑器。
  - 资源仅处理当前内存中的 data URL / blob URL（开发期示例课件无本地资源）。

### 1.5 独立 .html 播放包导出

- **文件**：
  - `apps/web/standalone-player.html`
  - `apps/web/standalone-player.tsx`
  - `apps/web/vite.standalone.config.ts`
  - `apps/web/src/lib/export.ts`
  - `apps/web/src/editor/Editor.tsx`
- **能力**：
  - 使用 `vite-plugin-singlefile` 将 Player Runtime（React + GSAP + Tailwind）打包为单文件 HTML。
  - `standalone-player.tsx` 从 `window.__COURSEWARE__` 读取课件数据并渲染 `Player`。
  - 导出 HTML 时，前端 fetch `/standalone-player.html` 模板，注入课程 JSON，生成独立 `.html` 文件。
  - 生成的 HTML 可离线用浏览器直接打开播放。

### 1.6 构建脚本

- **文件**：`apps/web/package.json`
- 新增 `build:standalone` 脚本：`tsc --noEmit && vite build --config vite.standalone.config.ts`。
- 构建产物 `dist-standalone/standalone-player.html` 会复制到 `public/standalone-player.html`，供开发服务器和后续生产构建使用。

---

## 2. 自测结果

运行 Phase 5 Playwright E2E 测试：

```bash
node apps/web/scripts/test-export.mjs
```

输出：

```
✅ Editor loaded
✅ .courseware package downloaded (17192 bytes)
✅ .courseware package imported
✅ HTML package downloaded (321355 bytes)
✅ Standalone HTML rendered correctly
✅ Courseware list API returned 1 items

✅ All export tests passed!
```

同时通过了全量 TypeScript 类型检查：

```bash
pnpm --filter @courseware/web type-check
pnpm --filter @courseware/server type-check
pnpm --filter @courseware/shared type-check
```

---

## 3. 已知问题与后续优化

1. **资源 base64 编码**：当前示例课件无图片/音频资源。真实资源应在前端导出时统一转为 base64 内嵌或保持相对路径；后端导出已支持从 `generated/assets/` 打包。
2. **.courseware 重新导入后端**：当前前端导入仅在编辑器本地生效，未调用后端保存。后续可对接 `POST /api/courseware` 实现云端保存。
3. **HTML 包体积**：单文件 HTML 约 300KB（gzip 后 ~100KB），随着资源增加会变大。后续可提供分包导出或仅内联必要运行时。
4. **拖拽题/状态机编辑**：阶段 4 中标记为可选/未完全实现的项（拖拽题、状态机可视化编辑）仍可在后续迭代中补充。
5. **生产部署**：`public/standalone-player.html` 需要在 `pnpm build` 前通过 `pnpm build:standalone` 生成，可加入 CI 或 root `build` pipeline。

---

## 4. 文件变更清单

| 文件 | 说明 |
|------|------|
| `apps/server/src/modules/courseware/courseware.controller.ts` | 新增 CRUD 与 export/package 路由 |
| `apps/server/src/modules/courseware/courseware.service.ts` | 新增内存 CRUD、Schema 校验、ZIP 导出 |
| `apps/server/src/modules/courseware/courseware.module.ts` | 导入 AssetsModule |
| `apps/server/src/modules/assets/*.ts` | 新建资源管理模块 |
| `apps/server/src/app.module.ts` | 注册 AssetsModule |
| `apps/web/src/lib/export.ts` | 新建导出/导入工具函数 |
| `apps/web/src/editor/Editor.tsx` | 添加导出/导入/HTML 按钮 |
| `apps/web/standalone-player.html` | 独立播放器 HTML 入口 |
| `apps/web/standalone-player.tsx` | 独立播放器 TSX 入口 |
| `apps/web/vite.standalone.config.ts` | Vite 单文件构建配置 |
| `apps/web/public/standalone-player.html` | 复制后的模板文件 |
| `apps/web/package.json` | 新增 `build:standalone` 脚本 |
| `apps/web/scripts/test-export.mjs` | 新建 Phase 5 E2E 自测脚本 |

---

## 5. 完成日期

2026-06-14
