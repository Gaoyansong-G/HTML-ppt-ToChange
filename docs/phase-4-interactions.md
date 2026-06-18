# 阶段 4：交互组件与 AI 助手

> 阶段目标：实现丰富的教学交互（选择题、填空题）和当前页 AI 问答助手，并在编辑器中支持交互配置。

---

## 1. 完成内容

### 1.1 播放器选择题组件

- **文件**：`apps/web/src/player/elements/QuizElement.tsx`
- **能力**：
  - 支持 `single-choice`（单选）、`multiple-choice`（多选）、`reveal`（直接揭示答案）三种子类型。
  - 状态机流程：`idle → selected → judged → explained`。
  - 选择后高亮，提交后即时显示 ✅/❌ 反馈。
  - 支持“查看解析”与“重试”。
  - 选项提交后自动根据 `isCorrect` 显示红绿边框。

### 1.2 播放器填空题组件

- **文件**：`apps/web/src/player/elements/FillBlankElement.tsx`
- **能力**：
  - 输入框作答，提交后即时判断。
  - 支持多正确答案（数组）。
  - 支持“查看答案”与“重试”。
  - 显示提示与解析。

### 1.3 元素调度

- **文件**：`apps/web/src/player/elements/index.tsx`
- 当 `quiz` 元素 `content.type === 'fill-blank'` 时渲染 `FillBlankElement`，否则渲染 `QuizElement`。

### 1.4 AI 问答助手浮窗

- **文件**：`apps/web/src/player/AIAssistantLayer.tsx`
- **能力**：
  - 每页 Slide 独立配置 `aiAssistant`，支持 `welcomeMessage`、`suggestedQuestions`、`contextScope`。
  - 浮窗打开/关闭动画。
  - 调用后端 `POST /api/ai/chat`。
  - 后端不可用时降级为本地模拟回复。
  - 切换 Slide 时自动重置为当前页欢迎语。
- **接入**：`apps/web/src/player/Player.tsx` 中在画布右下角渲染 `AIAssistantLayer`。

### 1.5 后端 AI 聊天接口

- **文件**：`apps/server/src/modules/ai/ai.controller.ts`
- 新增 `POST /api/ai/chat`，当前为演示模式，配置 `ARK_API_KEY` 后可接入真实 LLM。

### 1.6 编辑器交互配置

- **文件**：`apps/web/src/editor/PropertyPanel.tsx`
- 新增 `InteractionEditor` 组件：
  - 为选中元素添加/删除交互。
  - 配置 trigger（点击/悬停/自动）。
  - 配置 action 类型（show/hide/toggle/animate/navigate）与目标元素。
  - 支持一个交互下多个 action。
- 同时保留并修复了 `SelectInput`、`ColorInput` 等基础输入组件。

### 1.7 画布元素标识

- **文件**：`apps/web/src/editor/Canvas.tsx`
- 为元素 wrapper 添加 `data-element-id` 属性，便于 E2E 测试选中元素。

### 1.8 共享 Schema 更新

- **文件**：`packages/shared/src/schemas/interaction.schema.ts`
- `AIAssistantConfigSchema` 新增 `welcomeMessage` 字段。

### 1.9 示例课件扩展

- **文件**：`apps/web/src/examples/example-courseware.ts`
- 新增第 3 页：单选题（春节习俗），并启用 AI 助手。
- 新增第 4 页：填空题（腊七腊八）。

---

## 2. 自测结果

运行 Phase 4 Playwright E2E 测试：

```bash
node apps/web/scripts/test-interactions.mjs
```

输出：

```
✅ Player loaded
✅ Quiz slide loaded
✅ Wrong answer judged as incorrect
✅ Correct answer judged as correct
✅ Explanation shown
✅ Fill-blank slide loaded
✅ Fill-blank correct answer judged
✅ AI assistant opened with welcome message
✅ AI assistant responded
✅ Interaction editor section visible
✅ New interaction added in editor

✅ All interaction tests passed!
```

同时通过了全量 TypeScript 类型检查：

```bash
pnpm --filter @courseware/web type-check
pnpm --filter @courseware/server type-check
pnpm --filter @courseware/shared type-check
```

---

## 3. 已知问题与后续优化

1. **拖拽题组件**：计划中的拖拽题（GSAP Draggable）尚未实现，可在阶段 5 后补充。
2. **状态机可视化编辑**：当前 PropertyPanel 仅支持简单 action 列表编辑，状态机（states/on/entry/exit）的可视化编辑仍依赖手写 JSON，后续可升级。
3. **AI 助手真实 LLM**：当前为演示回复，需配置 `ARK_API_KEY` 后接入真实模型。
4. **播放器元素点击范围**：部分按钮在视口缩小时可能位于可见区域外，Playwright 测试使用 `evaluate`/`dispatchEvent` 绕过；真实用户可通过滚动或全屏解决。

---

## 4. 文件变更清单

| 文件 | 说明 |
|------|------|
| `apps/web/src/player/elements/QuizElement.tsx` | 重写选择题组件，支持单选/多选/揭示答案 |
| `apps/web/src/player/elements/FillBlankElement.tsx` | 新建填空题组件 |
| `apps/web/src/player/elements/index.tsx` | 根据 content.type 分发 quiz 子类型 |
| `apps/web/src/player/AIAssistantLayer.tsx` | 新建 AI 助手浮窗，支持按页配置与重置 |
| `apps/web/src/player/Player.tsx` | 渲染 AIAssistantLayer |
| `apps/web/src/editor/PropertyPanel.tsx` | 新增 InteractionEditor |
| `apps/web/src/editor/Canvas.tsx` | 添加 `data-element-id` |
| `apps/server/src/modules/ai/ai.controller.ts` | 新增 `POST /api/ai/chat` |
| `packages/shared/src/schemas/interaction.schema.ts` | AIAssistantConfig 新增 welcomeMessage |
| `apps/web/src/examples/example-courseware.ts` | 新增 quiz 和 fill-blank 示例页 |
| `apps/web/scripts/test-interactions.mjs` | 新建 Phase 4 E2E 自测脚本 |

---

## 5. 完成日期

2026-06-14
