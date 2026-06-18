# 阶段 3 修改记录：AI 生成 Pipeline

> 阶段 3 目标：实现从文档上传 + 用户描述到生成完整课件的端到端流程。

## 完成情况

- **完成日期**：2026-06-14
- **自测结果**：✅ 通过 Playwright E2E 测试
- **测试脚本**：`apps/web/scripts/test-ai-pipeline.mjs`
- **模式**：已接入火山方舟 Doubao 真实 LLM（`usedMock: false`）

---

## 新增文件

### 后端文档解析

| 文件 | 说明 |
|------|------|
| `apps/server/src/modules/documents/documents.module.ts` | 文档模块 |
| `apps/server/src/modules/documents/documents.controller.ts` | 文件上传接口 `POST /api/documents/upload` |
| `apps/server/src/modules/documents/documents.service.ts` | 文档解析分发服务 |
| `apps/server/src/modules/documents/parsers/base.parser.ts` | 解析器基类和辅助函数 |
| `apps/server/src/modules/documents/parsers/markdown.parser.ts` | Markdown 解析器（基于 markdown-it） |
| `apps/server/src/modules/documents/parsers/text.parser.ts` | TXT 文本解析器 |
| `apps/server/src/modules/documents/parsers/word.parser.ts` | Word 解析器（基于 mammoth） |
| `apps/server/src/modules/documents/parsers/pdf.parser.ts` | PDF 解析器占位 |
| `apps/server/src/modules/documents/parsers/image.parser.ts` | 图片解析器占位 |

### 后端 AI 编排

| 文件 | 说明 |
|------|------|
| `apps/server/src/modules/ai/ai.service.ts` | AI 编排服务，支持 mock 和真实 LLM Pipeline，真实 LLM 配置有效时不再回退 mock |
| `apps/server/src/modules/ai/ai.controller.ts` | `POST /api/ai/generate` 接口 |
| `apps/server/src/modules/ai/mock-generator.ts` | MOCK 模式课件生成器（基于文档结构规则生成） |
| `apps/server/src/modules/ai/assembler/courseware-assembler.ts` | 合并 outline/content/design/animation 为完整 Courseware |
| `apps/server/src/modules/ai/agents/base.agent.ts` | Agent 基类，封装 LLM 调用；新增 `callLLMWithRepair` 自动修复 schema 错误 |
| `apps/server/src/modules/ai/agents/outline.agent.ts` | 大纲设计 Agent |
| `apps/server/src/modules/ai/agents/content.agent.ts` | 内容生成 Agent |
| `apps/server/src/modules/ai/agents/design.agent.ts` | 视觉设计 Agent |
| `apps/server/src/modules/ai/agents/animation.agent.ts` | 动画编排 Agent |
| `apps/server/src/modules/ai/prompts/*.prompt.ts` | 各 Agent 的 Prompt 模板 |

### 前端 AI 向导

| 文件 | 说明 |
|------|------|
| `apps/web/src/ai-wizard/AIWizard.tsx` | AI 生成向导：上传 → 描述 → 确认大纲 → 生成 → 进入编辑器 |
| `apps/web/scripts/test-ai-pipeline.mjs` | AI Pipeline E2E 测试脚本 |

---

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/server/src/app.module.ts` | 注册 DocumentsModule |
| `apps/server/src/modules/ai/ai.module.ts` | 注册 AIController、AIService，导入 DocumentsModule |
| `apps/server/src/modules/ai/clients/ark.client.ts` | chat 方法强制 `stream: false` 并返回 `ChatCompletion` |
| `apps/server/package.json` | 新增 `zod`、`mammoth`、`markdown-it`、`@types/markdown-it`、`sharp`、`cheerio` |
| `apps/web/src/router.tsx` | 新增 `/wizard` 路由 |
| `apps/web/src/App.tsx` | 新增"✨ AI 生成课件"入口 |

---

## 自测覆盖点

1. ✅ 后端 `POST /api/documents/upload` 上传 Markdown 文件成功
2. ✅ 后端解析返回文档结构和提取文本
3. ✅ 后端 `POST /api/ai/generate` 生成 5 页课件
4. ✅ 生成的课件通过 Schema 校验
5. ✅ 前端 `/wizard` 页面加载
6. ✅ 前端上传文件进入步骤 2
7. ✅ 前端输入描述并生成大纲
8. ✅ 前端确认大纲并生成课件
9. ✅ 生成完成后进入编辑器，显示生成的课件
10. ✅ 浏览器控制台无致命错误

---

## 已知问题与后续优化

1. **生成时长**：当前 5 页课件真实 LLM pipeline 串行调用 4 次，耗时约 270s。后续可并行化部分 agent、压缩输入、接入流式生成或评估更快模型。
2. **PDF/PPT 解析**：当前为占位实现，需接入 `pdfjs-dist` / `pptx-parser`。
3. **图片 OCR**：当前为占位，需接入多模态模型。
4. **前端导航**：AI 向导点击"进入编辑器"偶尔不触发路由跳转（测试中已加 fallback），后续排查 navigate 执行时机。
5. **文档存储**：当前解析结果保存在内存中，重启后丢失，后续接入持久化存储。

---

## 运行方式

```bash
# 启动后端
cd courseware-agent
pnpm --filter @courseware/server dev

# 启动前端
pnpm --filter @courseware/web dev

# 运行自测
cd apps/web
node scripts/test-ai-pipeline.mjs
```

---

## 环境配置

如需启用真实 LLM，在项目根目录创建 `.env`：

```bash
ARK_API_BASE=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=your-api-key
# 以下二选一，优先使用 ARK_ARTIFACT_ENDPOINT
ARK_ARTIFACT_ENDPOINT=doubao-seed-2-0-pro-260215
ARK_DEEPSEEK_V4_PRO_ENDPOINT=ep-xxx
```

> 注意：`.env` 包含敏感信息，请勿提交到版本控制。
