# Courseware Agent 整体解决方案与执行计划

## 1. 上下文与目标

### 1.1 背景
用户正在构建一个教育 Agent 主系统，希望新增一个**模块化能力：AI 交互式课件生成与编辑系统**。该模块未来接入主系统，但当前按独立模块设计与实现。主系统技术栈为 React + TypeScript + NestJS。

### 1.2 目标
- 上传 PDF / Word / PPT / Markdown / TXT / 图片等源文件。
- 用户用自然语言描述课件范围。
- AI 生成现代化、可播放、可编辑的课件。
- 课件效果对标并**超越希沃（Seewo）**：生成质量、交互流畅度/丰富度、视觉美观度、编辑体验全面看齐或领先。
- 采用现代化呈现方式（非传统 PPT），支持：
  - 美观布局与自然转场
  - 元素级动画编排
  - 丰富教学交互（点击显隐、选择题、填空题、拖拽、AI 问答助手、激光笔/放大镜、手写批注）
  - 生成后可二次编辑

### 1.3 当前状态
- 绿地项目，目录中仅有一份由 OpenCode 生成的计划文档。
- 无代码、无配置、无 monorepo 结构。

---

## 2. 核心设计原则

1. **Schema 优先**：所有课件数据以结构化 JSON 描述，播放器、编辑器、AI 生成均围绕同一 Schema。
2. **语义与表现分离**：AI 先生成语义结构（内容、意图、交互逻辑），再由布局引擎/模板系统映射为视觉结构（坐标、样式、动画）。
3. **时间轴驱动**：把每一页课件视为 GSAP Timeline，元素是 Actor，入场/出场/交互均可精确编排。
4. **状态机驱动交互**：复杂交互（选择题、AI 问答、分支流程）使用状态机描述，避免简单 action 列表。
5. **模块化与可集成**：前端/后端/共享包边界清晰，未来可通过 NPM 包或 API 接入主系统。
6. **可编辑项目包 vs 播放包**：区分源文件（可编辑）与导出文件（可离线播放）。

---

## 3. 系统架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                         前端：apps/web                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  AI 生成向导  │  │  可视化编辑器  │  │      课件播放器           │   │
│  │  多轮对话     │  │  画布/属性面板 │  │  React + GSAP Runtime    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│              共享状态：Zustand + Courseware JSON Schema              │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST API / WebSocket（AI 流式）
┌──────────────────────────────────────────────────────────────────────┐
│                        后端：apps/server                             │
│  ┌──────────────┐  ┌─────────────────────┐  ┌──────────────────┐   │
│  │ 文档解析模块  │  │   AI 编排服务        │  │   课件/资源存储   │   │
│  │ PDF/DOC/PPT  │  │ 多 Agent Pipeline   │  │  本地文件系统    │   │
│  └──────────────┘  └─────────────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     共享包：packages/shared                          │
│         Courseware Schema / Types / Validation / Constants           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. 技术栈选型

| 层级 | 选型 | 说明 |
|---|---|---|
| Monorepo | pnpm workspace | 前后端 + 共享包统一管理 |
| 前端框架 | React 18 + TypeScript + Vite | 与主系统一致 |
| UI 组件 | shadcn/ui + Tailwind CSS | 快速搭建编辑器 UI |
| 动画引擎 | GSAP + @gsap/react + Flip Plugin + MotionPathPlugin + Draggable | 时间轴、转场、路径、拖拽 |
| 复杂矢量动画 | Lottie React | 预置高级动画素材 |
| 画布/批注 | Fabric.js 或 tldraw SDK | 播放时手写批注 |
| 公式 | KaTeX | 快速渲染数学公式 |
| 图表 | Mermaid / Excalidraw | 流程图、示意图 |
| 状态管理 | Zustand + Immer | 编辑器状态、历史记录 |
| 交互状态机 | XState 或自研轻量状态机 | 复杂交互逻辑 |
| Schema 校验 | Zod | 前后端共享校验 |
| 后端框架 | NestJS + TypeScript | 与主系统一致 |
| 文档解析 | pdfjs-dist / mammoth / pptx-parser / cheerio / sharp | 结构提取 + 图片提取 |
| OCR | PaddleOCR 或多模态模型 | 扫描版 PDF/图片 |
| AI SDK | OpenAI SDK（兼容火山方舟） | 统一接入 |
| 文件存储 | 本地文件系统（开发期） | 后续可替换为对象存储 |

---

## 5. 课件数据模型（Courseware Schema）

### 5.1 顶层结构

```typescript
interface Courseware {
  id: string;
  version: '1.0';
  title: string;
  topicDescription: string;
  sourceDocument?: {
    filename: string;
    extractedText: string;
    structure: DocumentNode[];
  };
  designSystem: DesignSystem;      // 设计 token
  slides: Slide[];
  assets: Asset[];                 // 图片、音频、字体等资源索引
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 Slide 结构

```typescript
interface Slide {
  id: string;
  order: number;
  title?: string;
  learningObjective?: string;      // 教学目标，AI 生成用于语义编辑
  layout: {
    templateId: string;            // 模板标识
    variant: string;               // 模板变体
    constraints: LayoutConstraint[];
  };
  background: Background;
  elements: Element[];
  transition: SlideTransition;     // 页面切换动画
  timeline: TimelineConfig;        // 本页时间轴配置
  stateMachine?: StateMachineConfig; // 页面级交互状态机
}
```

### 5.3 Element 结构

```typescript
interface Element {
  id: string;
  type: 'text' | 'image' | 'shape' | 'quiz' | 'ai-chat' | 'pointer' | 'formula' | 'diagram' | 'audio' | 'video';
  semanticRole?: string;           // 语义角色：标题、正文、例题、答案区等
  name?: string;
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    zIndex: number;
  };
  content: ElementContent;         // 根据 type 不同
  style: ElementStyle;
  animation: ElementAnimation;
  interactions: InteractionConfig[];
}
```

### 5.4 动画配置

```typescript
interface ElementAnimation {
  entrance: AnimationStep[];       // 入场动画序列
  exit: AnimationStep[];           // 出场动画序列
  emphasis?: AnimationStep[];      // 强调动画
}

interface AnimationStep {
  type: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale-in' | 'scale-out' | 'rotate' | 'draw' | 'typewriter' | 'morph' | 'bounce';
  duration: number;
  delay: number;
  easing: string;
  trigger: 'auto' | 'click' | 'after-prev' | 'with-prev';
}

interface SlideTransition {
  type: 'slide' | 'fade' | 'zoom' | 'flip' | 'wipe' | 'morph' | 'parallax';
  duration: number;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}
```

### 5.5 交互配置（状态机）

```typescript
interface InteractionConfig {
  id: string;
  trigger: 'click' | 'hover' | 'drag' | 'voice' | 'auto' | 'timeout';
  condition?: string;              // 可选条件表达式
  actions: InteractionAction[];
}

interface InteractionAction {
  type: 'show' | 'hide' | 'toggle' | 'animate' | 'speak' | 'ask-ai' | 'reveal-answer' | 'set-state' | 'navigate' | 'play-sound' | 'record-annotation';
  targetId?: string;
  payload?: Record<string, any>;
}

interface StateMachineConfig {
  initial: string;
  states: Record<string, {
    on?: Record<string, { target: string; actions?: InteractionAction[] }>;
    entry?: InteractionAction[];
    exit?: InteractionAction[];
  }>;
}
```

### 5.6 AI 问答助手上下文

```typescript
interface AIAssistantConfig {
  enabled: boolean;
  contextScope: 'slide' | 'courseware' | 'document';
  systemPrompt?: string;
  suggestedQuestions?: string[];
}
```

---

## 6. 动画与转场系统设计

### 6.1 核心理念
- 每页 Slide = 一个 GSAP Timeline。
- 所有元素动画在 Timeline 上编排。
- 页面切换使用独立的 Transition Timeline，旧页出场和新页入场无缝衔接。
- 支持全局时间轴控制：播放、暂停、快进、后退、跳到指定页/元素。

### 6.2 播放器运行时

```
Player Runtime
├── SlideTransitionController（页面切换）
├── SlideTimelineController（当前页时间轴）
├── ElementAnimationController（元素动画）
├── InteractionController（点击/拖拽等交互）
├── AnnotationLayer（手写批注层）
└── AIAssistantLayer（AI 问答浮层）
```

### 6.3 自然转场策略
- **Parallax**：背景与前景以不同速度移动。
- **Morph**：元素从上一页变形到下一页（需元素 id 连续）。
- **Wipe/Zoom/Flip**：常见转场，但需统一缓动曲线。
- **元素接力**：上一页最后一个元素动画结束时，下一页第一个元素已经开始入场。

### 6.4 性能优化
- 使用 `will-change`、`transform`、`opacity` 做动画。
- GSAP 动画优先使用 `x/y/scale/rotation/opacity`。
- 大量元素时启用虚拟化，仅渲染当前页及相邻页。
- 课堂低性能设备提供"低动画模式"。

---

## 7. 交互系统设计

### 7.1 状态机驱动
所有复杂交互用状态机描述，例如选择题：

```
idle → selected → judged → explained → nextSlide
```

每个状态进入/退出可触发动画、显示/隐藏元素、调用 AI 等。

### 7.2 交互组件清单

| 组件 | 能力 |
|---|---|
| 点击显隐 | 点击后显示答案/解析 |
| 单选/多选题 | 选择、判断、显示解析 |
| 填空题 | 输入校验、逐步揭示 |
| 拖拽题 | 拖拽到目标区域，GSAP Draggable |
| 图形解构 | 点击图形部位分步展示 |
| AI 问答助手 | 浮窗对话，上下文绑定当前 Slide |
| 激光笔/放大镜 | 鼠标轨迹高亮，Pointer 元素跟随 |
| 手写批注 | Fabric.js/tldraw 层覆盖 |
| 语音朗读 | TTS 调用，高亮当前朗读文本 |
| 计时器/倒计时 | 课堂活动控制 |

### 7.3 AI 问答上下文
- 助手始终知道当前 Slide 的 `learningObjective` 和可见元素内容。
- 学生提问时，把当前上下文 + 问题发给 LLM。
- 返回结果可在浮窗中展示，也可触发页面元素变化（如显示解释框）。

---

## 8. AI 生成 Pipeline

### 8.1 多 Agent 协作

| 步骤 | Agent | 模型 | 输入 | 输出 |
|---|---|---|---|---|
| 1. 文档解析 | 后端服务 | - | PDF/Word/PPT 等 | 结构化文档树 + 图片/公式 |
| 2. 内容定位 | locate | DeepSeek-v4-pro | 用户描述 + 文档结构 | 相关章节/知识点范围 |
| 3. 大纲设计 | outline | DeepSeek-v4-pro | 知识点范围 | 课件大纲（页数、目标、布局类型） |
| 4. 内容生成 | content | DeepSeek-v4-pro | 大纲 + 原文 | 每页语义内容、题目、配图描述 |
| 5. 视觉设计 | design | DeepSeek-v4-pro | 语义内容 | 模板选择、配色、元素位置、动画方案 |
| 6. 快速草稿 | draft | DeepSeek-v4-flash | 简化输入 | 快速大纲/单页内容 |
| 7. 动画编排 | animation | DeepSeek-v4-pro / 规则引擎 | 视觉结构 | 动画时间轴、交互状态机 |
| 8. 图片处理 | image | 豆包 2.0 pro | 原文图片 + 配图描述 | 图片相关性判断、OCR、补充配图 |

### 8.2 模型选型说明

- **DeepSeek-v4-pro**：主力模型，负责所有需要深度推理、长上下文理解、结构化输出的任务（定位、大纲、内容、视觉、动画）。
- **DeepSeek-v4-flash**：轻量快速模型，用于快速草稿、简单场景、低精度要求的任务。
- **豆包 2.0 pro**：多模态模型，负责图片理解、OCR、图片质量判断、配图生成。
- 所有模型通过火山方舟 OpenAI 兼容接口调用，具体 endpoint ID 需在阶段 0 前核实并写入 `.env`。

### 8.3 结构化输出与校验
- 每个 Agent 输出 JSON，使用 OpenAI function calling / JSON mode。
- 用 Zod Schema 在后端校验。
- 校验失败时自动重试（最多 3 次），并记录失败原因。

### 8.3 Prompt 工程
- 每个 Agent 有独立 prompt 文件（`locate.prompt.ts`、`outline.prompt.ts`、`content.prompt.ts`、`design.prompt.ts`、`animation.prompt.ts`、`image.prompt.ts`）。
- Prompt 中包含 few-shot 示例和输出 Schema。
- 使用火山方舟真实 endpoint ID（需用户核实替换）。

### 8.4 配图策略
- 原文图片：用多模态模型判断相关性/质量，高质量保留，低质量过滤。
- AI 生成配图：受控生成，仅当明确需要且原文无合适图片时调用。
- 所有配图生成记录 prompt 与结果，便于审计和二次编辑。

---

## 9. 文档解析策略

### 9.1 按类型解析

| 类型 | 库/方案 | 输出 |
|---|---|---|
| PDF | pdfjs-dist + pdf2pic | 带位置信息的文本块、图片、页码 |
| Word | mammoth / docx-parser | 标题层级、段落、表格、图片 |
| PPT | pptx-parser | 幻灯片文本、图片、原布局 |
| Markdown | marked / unified | AST |
| TXT | 直接读取 | 段落 |
| 图片 | OCR / 多模态模型 | 文本 + 描述 |

### 9.2 结构还原
- 提取后输出统一 `DocumentNode` 树：
  - `heading`（层级）
  - `paragraph`
  - `list`
  - `table`
  - `image`
  - `formula`
  - `page-break`
- AI 基于 DocumentNode 树而非纯文本生成课件，保证结构正确。

---

## 10. 编辑器设计

### 10.1 布局

```
┌─────────────────────────────────────────────────────────────┐
│                        顶部工具栏                             │
├──────────────┬────────────────────────────┬─────────────────┤
│              │                            │                 │
│  Slides 面板  │         画布               │   属性面板      │
│  - 缩略图     │    (React + GSAP 渲染)      │  - 元素属性     │
│  - 增删排序   │                            │  - 动画时间轴   │
│  - 模板切换   │                            │  - 交互状态机   │
│              │                            │  - AI 助手面板  │
├──────────────┴────────────────────────────┴─────────────────┤
│                     底部：动画时间轴                          │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 核心能力
- 元素拖拽、缩放、旋转、层级调整。
- 文本内联编辑。
- 模板切换：选择新模板时智能迁移内容。
- 动画时间轴可视化编辑：调整顺序、时长、触发方式。
- 交互状态机可视化编辑。
- AI 助手面板：选中元素或 Slide 后可要求 AI 改写、重生成、配图。
- Undo/Redo（基于 Immer 快照）。
- 实时预览：编辑器内随时进入播放模式。

### 10.3 编辑粒度
- **语义编辑**：修改教学目标、知识点、题目难度等，AI 自动调整呈现。
- **视觉编辑**：改位置、颜色、字体、动画。
- **交互编辑**：调整状态机、触发条件、动作。

---

## 11. 导出策略

### 11.1 可编辑项目包（`.courseware`）
- ZIP 格式，包含 `courseware.json` + `assets/`。
- 可在编辑器中重新打开修改。

### 11.2 独立播放包（`.html`）
- 单文件 HTML 或 HTML + assets 文件夹。
- 内嵌 Player Runtime + Courseware JSON + 资源（base64 或相对路径）。
- 支持离线播放。

### 11.3 后续扩展
- SCORM 1.2 / 2004 包（接入 LMS）。
- PPTX 导出（兼容传统场景）。
- H5P 格式。

---

## 12. 项目目录结构

```
courseware-agent/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── schemas/
│       │   │   ├── courseware.schema.ts
│       │   │   ├── slide.schema.ts
│       │   │   ├── element.schema.ts
│       │   │   └── animation.schema.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── constants/
│       │       └── index.ts
│       └── package.json
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── Editor.tsx
│   │   │   │   ├── Canvas.tsx
│   │   │   │   ├── SlideSidebar.tsx
│   │   │   │   ├── PropertyPanel.tsx
│   │   │   │   ├── AnimationTimeline.tsx
│   │   │   │   └── AIAssistantPanel.tsx
│   │   │   ├── player/
│   │   │   │   ├── Player.tsx
│   │   │   │   ├── SlideView.tsx
│   │   │   │   ├── TransitionController.ts
│   │   │   │   ├── TimelineController.ts
│   │   │   │   └── interactions/
│   │   │   ├── ai-wizard/
│   │   │   │   ├── AIWizard.tsx
│   │   │   │   ├── steps/
│   │   │   │   └── hooks/
│   │   │   ├── stores/
│   │   │   │   ├── editor.store.ts
│   │   │   │   └── history.store.ts
│   │   │   ├── lib/
│   │   │   │   ├── design-system/
│   │   │   │   ├── layout-engine/
│   │   │   │   └── gsap/
│   │   │   └── types/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── server/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── documents/
│       │   │   │   ├── documents.controller.ts
│       │   │   │   ├── documents.service.ts
│       │   │   │   └── parsers/
│       │   │   ├── ai/
│       │   │   │   ├── ai.controller.ts
│       │   │   │   ├── ai.service.ts
│       │   │   │   ├── agents/
│       │   │   │   │   ├── locate.agent.ts
│       │   │   │   │   ├── outline.agent.ts
│       │   │   │   │   ├── content.agent.ts
│       │   │   │   │   ├── design.agent.ts
│       │   │   │   │   └── animation.agent.ts
│       │   │   │   ├── prompts/
│       │   │   │   └── clients/
│       │   │   │       └── ark.client.ts
│       │   │   ├── courseware/
│       │   │   │   ├── courseware.controller.ts
│       │   │   │   └── courseware.service.ts
│       │   │   └── assets/
│       │   │       ├── assets.controller.ts
│       │   │       └── assets.service.ts
│       │   └── main.ts
│       ├── uploads/
│       ├── generated/
│       └── package.json
```

---

## 13. 分阶段执行计划

### 阶段 0：项目骨架与 Schema 定义
**目标**：搭建可运行的 monorepo，定义核心 Schema。

**任务**：
1. 初始化 pnpm workspace + turbo。
2. 创建 `packages/shared`：Courseware / Slide / Element / Animation / Interaction Schema（Zod + TS）。
3. 创建 `apps/web`：Vite + React + TS + Tailwind + shadcn/ui + GSAP。
4. 创建 `apps/server`：NestJS + 统一 AI client（火山方舟 OpenAI SDK）。
5. 配置 `.env.example`、联调脚本、根目录 `dev`。
6. 创建 2-3 份手写示例课件 JSON，用于验证 Schema。

**验收**：
- `pnpm dev` 同时启动前后端。
- 示例 JSON 通过 Zod 校验。
- 共享包能被前后端正确引用。

---

### 阶段 1：Player Runtime 核心播放器
**目标**：能播放示例课件，支持动画与基础交互。

**任务**：
1. 实现 `Player Runtime`：Slide 渲染、TransitionController、TimelineController。
2. 实现元素入场/出场/强调动画（基于 GSAP Timeline）。
3. 实现 Slide 切换动画（fade/slide/zoom/flip/wipe）。
4. 实现播放控制：播放/暂停、翻页、跳转、全屏。
5. 实现点击显隐基础交互。
6. 响应式适配与低动画模式。

**验收**：
- 示例课件可流畅播放。
- 页面切换自然，动画无卡顿。
- 支持键盘/手势翻页。

---

### 阶段 2：文档解析服务
**目标**：支持主流文档上传与结构化提取。

**任务**：
1. NestJS 上传接口与文件存储。
2. PDF 解析（pdfjs-dist：文本 + 图片 + 位置）。
3. Word 解析（mammoth：结构 + 图片）。
4. PPT 解析（pptx-parser：文本 + 图片 + 布局）。
5. Markdown / TXT 解析。
6. 输出统一 `DocumentNode` 树。

**验收**：
- 上传 PDF/Word/PPT/Markdown/TXT 后返回结构化文档树。
- 图片可提取并保存到 assets。

---

### 阶段 3：AI 生成 Pipeline（核心！）
**目标**：从文档到课件 JSON 的端到端生成。

**任务**：
1. 接入火山方舟真实模型 endpoint（需用户核实）。
2. 实现 `locate` Agent：根据用户描述定位相关章节。
3. 实现 `outline` Agent：生成课件大纲。
4. 实现 `content` Agent：生成每页语义内容、题目、配图描述。
5. 实现 `design` Agent：选择模板、生成视觉结构。
6. 实现 `animation` Agent/规则引擎：编排动画与交互。
7. 实现 Zod 校验 + 自动重试机制。
8. 后端编排服务串起多 Agent 流程，支持流式返回进度。

**验收**：
- 上传文档 + 输入描述 → 生成可播放课件 JSON。
- 输出通过 Schema 校验。
- 用户可在大纲阶段修改后重新生成。

---

### 阶段 4：可视化编辑器
**目标**：让老师能修改 AI 生成的课件。

**任务**：
1. 三栏编辑器布局：Slides 面板、画布、属性面板。
2. 元素拖拽、缩放、旋转、层级调整。
3. 文本内联编辑。
4. Slide 增删排序、模板切换。
5. 属性面板：样式、动画、交互。
6. Undo/Redo。
7. 本地保存/读取 `.courseware` 项目包。
8. 编辑器内一键预览/播放。

**验收**：
- 可修改文字、位置、动画。
- 可新增/删除/排序 Slide。
- 修改后可保存并重新播放。

---

### 阶段 5：高级交互组件
**目标**：实现超越 PPT 的教学交互。

**任务**：
1. 选择题（单选/多选）组件 + 状态机。
2. 填空题组件 + 校验反馈。
3. 拖拽题组件（GSAP Draggable）。
4. 图形解构/分步展示。
5. AI 问答助手浮窗（上下文绑定当前 Slide）。
6. 激光笔/放大镜效果。
7. 手写批注层（Fabric.js/tldraw）。
8. 语音朗读（Web Speech API / TTS 服务）。

**验收**：
- 每种交互在播放器中可正常触发。
- 状态机可驱动多步交互流程。

---

### 阶段 6：图片处理与配图
**目标**：让课件视觉素材充足且相关。

**任务**：
1. 文档图片提取与去重。
2. 多模态模型判断图片相关性/质量。
3. 高质量图片自动嵌入对应 Slide。
4. 低质量/无关图片过滤。
5. AI 受控配图（仅必要时调用）。
6. 图片资源管理（压缩、缓存、CDN 准备）。

**验收**：
- 文档图片正确提取。
- 配图质量可接受，无滥用。

---

### 阶段 7：导出与模板系统
**目标**：支持发布与复用。

**任务**：
1. 导出独立 HTML（离线播放）。
2. 导出 `.courseware` 项目包。
3. 模板系统：内置多学科/多风格模板。
4. 模板市场基础结构（后续扩展）。
5. （可选）PPTX 导出。

**验收**：
- HTML 导出后可在浏览器离线打开。
- 模板可切换并正确渲染。

---

## 14. 阶段执行、自测与进度更新机制

### 14.1 每个阶段的标准流程

每个阶段完成后，必须执行以下闭环：

1. **自测**：按照该阶段验收清单逐项验证。
2. **修复**：自测不通过项当场修复；若因外部依赖阻塞，记录为"待解决"并说明原因。
3. **记录**：在 `courseware-agent-plan.md` 的"项目进度表"中更新状态、完成日期、自测结果、改动摘要。
4. **汇报**：向用户简要汇报阶段完成情况、关键实现点、待确认问题。

### 14.2 自测内容范围

| 维度 | 检查项 |
|---|---|
| 功能 | 验收清单全部通过 |
| Schema | 新增/修改的 JSON 结构通过 Zod 校验 |
| 构建 | `pnpm build` 无错误，`pnpm dev` 可启动 |
| 类型 | `pnpm type-check` 无 TS 错误 |
| 示例 | 示例数据可正常加载/播放/编辑 |
| 回归 | 不破坏上一阶段已完成功能 |

### 14.3 进度更新格式

在 `courseware-agent-plan.md` 的"项目进度表"中填写：

| 阶段 | 名称 | 状态 | 完成日期 | 自测结果 | 更新摘要 |
|---|---|---|---|---|---|
| 0 | 项目骨架搭建 | 已完成 | 2026-06-15 | 通过/不通过 | 初始化 pnpm workspace，定义 Schema... |

### 14.4 变更日志

每次阶段交付后，在 `courseware-agent-plan.md` 的"变更日志"中追加：

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-06-15 | 阶段 0 完成：搭建 monorepo + 核心 Schema | Claude |

---

## 15. 关键决策与取舍

| 决策 | 选择 | 原因 |
|---|---|---|
| 渲染技术 | React DOM + GSAP，不用 Canvas/WebGL | 开发效率高、兼容性好、编辑体验直接；Canvas 动画难编辑 |
| 布局方式 | 语义结构 + 模板自动布局 + 允许自由破坏 | AI 先生成美观布局，老师再细调 |
| 交互描述 | 状态机 | 比简单 action 更能表达复杂教学流程 |
| AI 模型 | DeepSeek-v4-pro / flash + 豆包 2.0 pro | 长上下文、强推理、中文教育场景、多模态 |
| 导出格式 | 可编辑项目包 + 独立播放包 | 同时满足修改和发布需求 |
| 存储 | 本地文件系统（MVP） | 快速验证，后续替换为对象存储 |

---

## 16. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| AI 输出 JSON 不稳定 | 高 | Zod 校验 + 自动重试 + 人工 fallback |
| 模型 endpoint 不存在 | 高 | 阶段 0 先去火山方舟控制台核实并替换 |
| 复杂动画在低配设备卡顿 | 中 | 低动画模式、性能预算、虚拟化 |
| AI 配图质量差/滥用 | 中 | 受控生成、人工开关、质量判断 |
| 文档结构复杂解析不准 | 中 | 多库组合、OCR 兜底、人工校对入口 |
| 编辑器状态复杂难维护 | 中 | Immer + Zustand + 历史快照 |
| 生成效果不及希沃 | 高 | 模板系统 + 设计 token + 持续收集反馈迭代 |

---

## 17. 下一步行动

1. 用户确认本方案。
2. 阶段 0 开始前，用户提供/核实火山方舟真实 endpoint ID。
3. 开始阶段 0：搭建 monorepo + Schema + 示例数据。

---

## 18. 项目进度表

| 阶段 | 名称 | 状态 | 完成日期 | 自测结果 | 更新摘要 |
|---|---|---|---|---|---|
| 0 | 项目骨架与 Schema 定义 | 已完成 | 2026-06-14 | 通过 | 初始化 pnpm workspace + turbo；创建 packages/shared（Zod Schema + TS 类型）；创建 apps/web（Vite+React+TS+Tailwind+GSAP）；创建 apps/server（NestJS+AI client）；配置 .env.example、联调脚本；创建 2 份示例课件 JSON；前后端类型检查、构建、启动均通过 |
| 1 | Player Runtime 核心播放器 | 未开始 | - | - | - |
| 2 | 文档解析服务 | 未开始 | - | - | - |
| 3 | AI 生成 Pipeline | 未开始 | - | - | - |
| 4 | 可视化编辑器 | 未开始 | - | - | - |
| 5 | 高级交互组件 | 未开始 | - | - | - |
| 6 | 图片处理与配图 | 未开始 | - | - | - |
| 7 | 导出与模板系统 | 未开始 | - | - | - |

---

## 19. 变更日志

| 日期 | 变更内容 | 变更人 |
|---|---|---|
| 2026-06-14 | 初始版本：确定整体方案、技术栈、阶段计划 | Claude |
| 2026-06-14 | 阶段 0 完成：搭建 monorepo + 核心 Schema + 前后端骨架 + 示例数据 | Claude |
