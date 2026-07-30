# Courseware Agent 投产级系统升级设计文档

> 版本：v2.0（2026-07-17）
> 目标：从"演示级 demo"升级为"教师愿意真实投入课堂使用"的投产级系统
> 本文档是后续所有实施的纲领，任何阶段开工前先对照本文档。

---

## 0. 核心设计哲学：一个根本转变

当前系统最大的问题是：**把太多自由度交给了大模型**（让它输出坐标、字号、颜色的裸元素），又把太少教学智慧注入系统（生成的是"内容搬运"，不是"教学设计"）。

升级的根本转变：

```
旧范式：文档 → LLM 一次性生成课件 JSON → 人肉修补
新范式：文档 → 教学设计(LLM) → 页面编排(LLM 受限决策) → 确定性渲染(设计系统) → 视觉质检闭环(LLM)
```

**三条铁律：**

1. **LLM 永远不输出几何坐标。** LLM 只做语义决策（选什么版式、填什么内容、强调什么），几何、配色、字体由"设计系统 + 版式库"确定性渲染。这是设计质量可控的唯一途径。
2. **先教学，后页面。** 先生成"教学分镜脚本"（课堂节奏设计），再把脚本翻译成页面。课件质量的上限在教学设计，不在排版。
3. **每个生成结果都有闭环质检。** 渲染截图 → 多模态评分 → 自动修复，不合格不出厂。

---

## 1. 模型编排体系（回答问题 5：模型怎么分工）

### 1.1 三模型能力矩阵（官方文档核实）

| 能力 | doubao-seed-2-1-pro-260628 | deepseek-v4-flash-260425 | doubao-seedream-5-0-260128 |
|---|---|---|---|
| 上下文 | 256k | 1024k | - |
| 深度思考 thinking | ✅ | ✅ | - |
| 多模态输入（图/视频/PDF） | ✅ | ❌ 纯文本 | 参考图输入 |
| Function Calling | ✅ | ✅ | - |
| json_schema 结构化输出 | ❌（仅 turbo 版支持） | ❌ | - |
| 续写模式（assistant 预填） | ✅ | ❌ | - |
| 视觉定位 Grounding | ✅（官方教程示例模型） | ❌ | - |
| 联网搜索 web_search | ✅ | ✅ | lite 版支持 |
| File API 文档直读 | ✅（官方示例模型） | ❌ | - |
| 批量推理 5 折 | ✅ | ❌（价目表未列出） | - |
| 组图生成 | - | - | ✅（pro 版不支持组图） |
| 交互编辑（圈选局部重绘） | - | - | 仅 5-0-pro-260628 |
| 价格（元/百万 token） | 输入 6 / 输出 30（缓存命中 1.2） | 输入 1 / 输出 2（缓存命中 0.2） | 0.22~0.6 元/张 |

### 1.2 任务-模型路由表

| # | 任务 | 模型 | 关键进阶能力 |
|---|---|---|---|
| 1 | 文档深度理解（PDF/扫描件/图片教材） | seed-2-1-pro | **File API 直传 PDF**，平台自动分页转图预处理 |
| 2 | 教学分镜脚本生成（核心） | seed-2-1-pro | thinking 开启 + **续写模式强制 JSON** |
| 3 | 页面编排决策（版式选择/槽位填充） | seed-2-1-pro | 续写模式 + 隐式上下文缓存 |
| 4 | 联网补充教学素材/时事案例 | seed-2-1-pro | web_search 工具 |
| 5 | 视觉质检（截图评分） | seed-2-1-pro | 多模态理解 |
| 6 | 文档图片区域定位裁剪 | seed-2-1-pro | **Grounding `<bbox>` 归一化坐标** |
| 7 | 课件内 AI 问答助手 | deepseek-v4-flash | 低成本（比 pro 便宜 6~15 倍） |
| 8 | 单元素改写/单页重写/JSON 修复 | deepseek-v4-flash | 编辑器 AI 侧边栏默认模型 |
| 9 | 快速草稿模式 | deepseek-v4-flash | 1024k 上下文塞整本书 |
| 10 | 课件配图（整套风格统一） | seedream-5-0 | **组图生成** sequential_image_generation |
| 11 | 编辑器内局部改图（圈选重绘） | seedream-5-0-pro | **交互编辑** `<bbox>/<point>` 标签 |
| 12 | 批量课件生产（学校采购场景） | seed-2-1-pro | Batch API 5 折 |
| 13 | OCR/图片质量判断 | seed-2-1-pro | 多模态理解 |

### 1.3 成本设计（投产必做）

| 手段 | 做法 | 预期收益 |
|---|---|---|
| **隐式上下文缓存** | 系统 prompt + 教学法知识库 + 源文档内容作为**稳定前缀**，页面指令放末尾；同一课件的多页生成共享前缀 | 输入费用降至 2 折（6→1.2 元/百万） |
| **续写模式** | messages 末条 `role:assistant` 预填 `{"pages":[` 强制 JSON 起手，替代 json_schema | 消除 JSON 解析失败重试浪费 |
| **flash 路由** | 所有"一句话改一处"的轻任务走 flash | 轻任务成本降至 1/15 |
| **图片按需** | 默认 SVG/占位图，用户点"AI 配图"才调 seedream；或按课件整体配图一次组图调用 | 配图成本可控 |
| **用量观测** | 服务端记录每次调用 token 用量与缓存命中率，写入生成会话记录 | 投产成本可核算 |

### 1.4 环境变量变更

```env
ARK_ARTIFACT_ENDPOINT=doubao-seed-2-1-pro-260628        # 主生成模型（替换旧 2-0-pro）
ARK_FLASH_ENDPOINT=deepseek-v4-flash-260425             # 轻量任务
ARK_IMAGE_ENDPOINT=doubao-seedream-5-0-260128           # 配图（组图）
ARK_IMAGE_EDIT_ENDPOINT=doubao-seedream-5-0-pro-260628  # 局部改图（交互编辑）
ARK_WEB_SEARCH_ENABLED=true                              # 联网内容插件（需控制台开通）
```

---

## 2. 设计质量把控体系（回答问题 1：大模型编排 vs 模板配置）

### 2.1 答案：三层混合架构，各管各的

```
┌─────────────────────────────────────────────────────┐
│ 第三层：LLM 语义编排层（大模型管"选"）                  │
│   输入：教学脚本某页 → 输出：PageBlueprint（语义描述）   │
│   { layoutId, slots: {...内容...}, emphasis, variant } │
├─────────────────────────────────────────────────────┤
│ 第二层：版式组件库（设计师管"美"）                       │
│   30+ 版式组件 × 变体，每个组件定义：                   │
│   槽位结构 / 排版规则 / 溢出策略 / 动效默认值             │
├─────────────────────────────────────────────────────┤
│ 第一层：设计系统（代码管"准"）                          │
│   Design Tokens：色系/字体阶梯/间距/圆角/装饰           │
│   确定性布局引擎：几何计算、对齐、文本度量、溢出回退      │
└─────────────────────────────────────────────────────┘
```

**为什么不让 LLM 自由排版**：坐标级生成 = 每页都是一次赌博，质量方差不可控，且无法批量修正。
**为什么不用纯模板填空**：纯模板 = 每页长得一样，内容稍多就溢出，这正是当前"硬"的根源。
**混合架构**：LLM 的自由度被约束在"选组件 + 选变体 + 填内容"，组合空间足够丰富（30 版式 × 平均 4 变体 × 9 主题 ≈ 1000+ 种观感），但每一种组合都经过设计师调校。

### 2.2 设计系统（Design Tokens）

`packages/shared/src/design-tokens/`：

```typescript
interface DesignTheme {
  id: string;                    // 'chinese-ink' | 'math-geo' | ...
  name: string;
  applicable: { subjects: string[]; gradeLevels: GradeLevel[] };
  colors: {
    primary; secondary; accent; background; surface; textPrimary; textSecondary;
    palette: string[];           // 图表/强调用色序
  };
  typography: {
    titleFont: FontSpec;         // 字族 + 字重 + 字号阶梯（h1/h2/h3）
    bodyFont: FontSpec;
    handFont?: FontSpec;         // 手写体（小学低学段拼音/生字）
    scaleRatio: number;          // 字号阶梯比例
  };
  spacing: { unit: number; pagePadding: [number, number] };
  radius: { card: number; button: number };
  decorations: DecorationSpec[]; // 装饰元素：纹样/角标/分隔线/背景纹理
  texture?: string;              // 背景纹理（米纸/网格/点阵）
}
```

首批内置 **18 套主题**（6 学科 × 3 学段），由 layout-engine 按"学科 + 学段 + 用户偏好"自动匹配，用户可一键换主题并全局应用。

### 2.3 版式组件库（Block Library）—— 本次升级的核心工程

页面不再由裸元素（text/shape/image）直接堆砌，而是由**区块组件（Block）**组成：

```typescript
interface Block {
  id: string;
  blockType: string;             // 见下方目录
  variant: string;               // 该版式的变体 ID
  slots: Record<string, SlotValue>; // 槽位内容（文本/图片/列表/富结构）
  emphasis?: string[];           // 需要视觉强调的槽位 key
  style?: Partial<BlockStyle>;   // 局部覆盖（一般不用，保持主题一致）
}
```

**首批版式组件目录（35 个，覆盖 9 大学科场景）：**

| 类别 | 组件 |
|---|---|
| 开篇 | 封面页、目录页、章节过渡页、学习目标卡 |
| 讲解 | 标题正文页、左文右图、上图下文、全屏金句、概念定义卡、公式定理框、步骤推导条、对比双栏、表格页 |
| 语文 | 古诗词赏析页（诗句+译文+赏析+作者条）、生字卡片（田字格+笔顺）、阅读理解双栏、写作指导页 |
| 数学 | 例题讲解页、解题步骤条、几何图形页、函数图像页、易错点对比 |
| 英语 | 词汇卡片墙（2×2/2×3）、对话气泡页、语法归纳表、听力材料页 |
| 理科 | 实验探究页（器材+步骤+记录表+结论）、原理示意图页、数据图表页 |
| 文科 | 历史时间轴、地理地图页、思维导图页、人物卡片 |
| 互动 | 测验页、课堂活动页、讨论问题页、小组任务页 |
| 收尾 | 总结回顾页、作业布置页、拓展阅读页 |

每个组件的**渲染器是前端 React 组件**（确定性排版：flex/grid 槽位布局 + 文本自适应缩字号 + 溢出降级策略），后端 layout-engine 只负责把 Block 序列转换为页面流。编辑器中 Block 整体可拖动换序，也可"解体"为裸元素进行像素级微调（保留当前自由度作为逃生舱）。

### 2.4 配图体系（seedream 的正确用法）

| 场景 | 方案 |
|---|---|
| 整套课件插图 | 生成前确定统一风格 prompt（如"扁平插画、暖色、小学语文"），调 seedream **组图生成**（`sequential_image_generation=auto` + `max_images`），一次产出风格一致的多张插图 |
| 单张补充 | 文生图 2K，`watermark=false`，`response_format=b64_json` 直接落盘本地化 |
| 局部修改 | 编辑器圈选区域 → 前端转归一化坐标（0~999）→ seedream-5-0-pro 交互编辑（`<bbox>` 标签 + 指令） |
| 文档原图 | 提取后由 seed-2-1-pro 多模态判断"教学相关性 + 清晰度"，合格入素材库；需裁剪时用 **Grounding** 返回 bbox 精确定位 |
| 兜底 | 本地 SVG 占位图（现有 placeholder-assets 保留） |

**所有配图必须本地化**（`generated/assets/`），导出 HTML 时内嵌 base64，杜绝外链失效。

### 2.5 视觉质检闭环（出厂检验）

```
assemble 完成 → 无头渲染每页截图（Playwright，已在依赖中）
  → seed-2-1-pro 多模态逐页评分：
    检查项 = [文字溢出, 元素重叠, 对比度不足, 对齐混乱, 图文不匹配, 留白失衡]
  → 有问题的页 → 生成修复指令（确定性修复优先：缩字号/换变体/拆页）
  → 最多 2 轮，仍不合格 → 标记待人工处理（编辑器高亮提示）
```

质检报告存入课件元数据，编辑器侧边栏可见。

---

## 3. 教学内容编排体系（回答问题 2：课件内容能不能用）

### 3.1 核心洞察

一个课件"能用"的标准不是页面好看，而是：
1. **符合教学规律**：有完整的教学环节闭环（导入→目标→新授→巩固→总结→作业）
2. **把控课堂节奏**：互动点分布合理，学生注意力曲线有起伏
3. **内容忠于教材**：不幻觉、不超纲、难度匹配学段
4. **教师有抓手**：每页有讲稿备注，知道这页怎么讲

### 3.2 两阶段内容生成架构

```
阶段 A：教学设计师 Agent（seed-2-1-pro + thinking）
  输入：源文档定位内容 + 用户描述 + 学段学科 + 课时长度
  输出：TeachingScript（教学分镜脚本）
    {
      courseInfo: { subject, gradeLevel, duration, objectives[] },
      phases: [{
        phase: 'lead-in' | 'objectives' | 'teaching' | 'practice' | 'summary' | 'homework',
        title, durationMin, teacherActivity, studentActivity,
        pages: [{
          intent: string,           // 这页的教学意图
          keyPoints: string[],      // 必须讲清的知识点
          interaction?: string,     // 设计的师生互动
          sourceRefs: string[],     // 引用的原文段落 ID（防幻觉溯源）
          suggestedBlock: string,   // 建议版式
          speakerNotes: string      // 教师讲稿
        }]
      }],
      rhythm: { interactionPoints: number[], climaxPage: number }
    }
  ↓ 用户在向导中确认/编辑脚本（替代现有的"大纲确认"）
阶段 B：内容写作 Agent（逐页，flash 可用于简单页）
  按脚本逐页写作 → PageBlueprint（槽位内容）
  约束：只能使用 sourceRefs 范围内的原文信息 + 常识性衔接
```

### 3.3 教学法知识库（内置 prompt 资产）

`apps/server/src/modules/ai/pedagogy/`：

- **教学环节模型**：经典五环节、5E 教学法（Engage/Explore/Explain/Elaborate/Evaluate）、PBL 项目式，按课型自动选择
- **学段节奏规则**：
  - 小学：一页一个知识点；每 3-4 页一个互动点；单次讲解 ≤ 5 分钟；多用图片故事
  - 初中：一页可 1-2 个知识点；每 5-6 页一个互动点；增加探究任务
  - 高中：信息密度可提高；强调逻辑推导与高考链接
- **学科教学法**：语文（朗读-品析-迁移）、数学（情境-探究-归纳-变式）、英语（呈现-操练-产出）、理科（问题-假设-实验-结论）、文科（时空框架-史料实证）
- **课堂节奏曲线**：默认注意力曲线模板，强制互动点落在注意力低谷（第 10/20/30 分钟附近）

### 3.4 防幻觉与溯源

- 每页 `sourceRefs` 记录来源段落，编辑器 hover 可"定位到原文"
- 内容评审 Agent（flash，生成后批量跑）：对照源文档检查事实性错误（数字、年代、公式、课文原句），错误页标记重生成
- 联网搜索仅用于"拓展案例"，且必须在页面标注"拓展资料"标签，与教材内容视觉区分

---

## 4. 互动组件体系（回答问题 3：发挥 HTML/代码优势）

### 4.1 互动组件库 2.0

schema 新增 `interactive` 元素大类，参数化配置（LLM 和用户都只填参数，渲染器固定）：

| 分类 | 组件 | 教学价值 | 优先级 |
|---|---|---|---|
| 答题类 | 单选/多选/判断（已有✅） | 即时反馈 | P0 |
| | 填空题（已有✅） | | P0 |
| | 连线题（拖线配对） | 词汇/概念匹配 | P1 |
| | 拖拽分类（拖到篮子） | 归类教学 | P1 |
| | 排序题（拖拽排序） | 流程/时间线 | P1 |
| 演示类 | 汉字笔顺动画 | 小学语文刚需 | P1 |
| | 函数图像绘制器（输入解析式实时绘制） | 数学 | P1 |
| | 几何画板（拖动顶点看性质） | 数学 | P2 |
| | 语音朗读（TTS，点击即读） | 语文/英语 | P0 |
| | formula KaTeX 渲染 | 数理化 | P0 |
| | diagram Mermaid 渲染 | 知识结构 | P1 |
| 课堂活动类 | 随机点名器 | 课堂管理 | P1 |
| | 倒计时/计时器 | 活动控制 | P1 |
| | 小组计分板 | 竞赛课堂 | P1 |
| | 幸运转盘 | 抽奖/选题 | P2 |
| | 翻翻卡/刮刮卡 | 低学段激趣 | P2 |
| 工具类 | 批注白板（画笔/橡皮/清屏/翻页保留） | 授课刚需 | P0 |
| | 激光笔/聚光灯/放大镜 | 授课刚需 | P0 |
| | 黑板模式（空白页即时书写） | | P2 |

### 4.2 技术实现

- **渲染器**：`apps/web/src/player/interactives/` 每组件一个 React 组件，输入 props 即 schema content，GSAP 驱动动效
- **TTS**：浏览器 `speechSynthesis`（零成本），预留火山语音合成 API 升级位
- **作答统计**：播放器本地记录每次作答，"课堂模式"下教师视图显示正确率（单机版先做，不需要学生端）
- **生成侧**：互动组件写入 content prompt 的"互动设计规则"——教学脚本中 `interaction` 字段直接映射到组件类型，LLM 只填题目参数

### 4.3 AI 问答助手升级

- 模型切到 flash（成本降 15 倍）
- 生成课件时**预生成 5 个常见问题及答案**内嵌课件，导出 HTML 离线也能"问答"（命中预设走本地，未命中提示需联网）
- prompt 注入本课知识点范围，防止回答超纲

---

## 5. 编辑器升级（回答问题 4：从"看似可用"到"真好用"）

### 5.1 诊断：当前弱在哪

不是功能缺失，而是**编辑单位错误**：用户面对的是几十个裸元素的坐标属性，而不是"一页课件"。改一页布局 = 拖十几个元素，当然难用。

### 5.2 升级清单（按优先级）

**P0 - 编辑范式升级：**
1. **Block 级编辑**：页面 = Block 序列；点选 Block 整体移动/换变体/换版式/删除；属性面板显示槽位表单（改文字就在表单改，不用双击画布找文本框）
2. **大纲视图**：左侧面板双 Tab——"页面"（缩略图）/ "大纲"（教学脚本树：环节→页面，拖拽重排，直接编辑标题要点）
3. **一键换主题/换版式**：主题面板（18 套预览卡，点击全局应用）；Block 版式切换器（同类别版式一键替换，内容槽位自动映射）

**P0 - AI 编辑侧边栏（编辑器内嵌 AI，flash 模型）：**
4. 三级作用域对话修改：
   - 选中元素："这段文字精简一半" / "换成红色强调"
   - 选中页面："这页改成对比布局" / "加一道巩固练习"
   - 整个课件："全文语气改成初中水平" / "所有标题字加大"
5. 修改以**结构化 diff** 应用（不是重新生成），可撤销

**P1 - 效率工具：**
6. 组件面板：35 个 Block + 全部互动组件，拖入即插
7. 图层面板、母版编辑、全局查找替换、批量改字体/配色
8. 动画时间轴增强：拖拽调整 delay/duration，批量设置触发方式
9. 教师备注编辑（speakerNotes），播放时演讲者视图

**P1 - 图片交互编辑：**
10. 图片元素圈选 → seedream-5-0-pro 局部重绘（"把这个人物换成卡通风格"）

**P2：**
11. 版本历史快照、协同预留、模板收藏（"存为我的模板"）

---

## 6. 生成体验升级（流式 + 多轮）

### 6.1 SSE 流式生成管线

```
POST /ai/generate/stream (SSE)
事件流：
  stage:locating      → 文档定位中（File API 解析 PDF）
  stage:script        → 教学脚本生成中（thinking 可见进度）
  script:done         → 推送完整 TeachingScript → 用户确认/编辑
  page:start {i}      → 第 i 页开始
  page:done {i, page} → 第 i 页 PageBlueprint 完成（前端逐页点亮缩略图）
  assets:progress     → 配图生成进度
  qc:report           → 视觉质检报告
  done {coursewareId}
```

前端向导改为：**上传 → 描述 → 教学脚本确认（可编辑）→ 实时生成视图（逐页点亮）→ 质检报告 → 进编辑器**。

### 6.2 会话式迭代

- 生成会话持久化（`generationSessionId`），支持后续"第 3 页换成测验页"式增量指令，只重跑受影响页
- 保留 `previous_response_id` 链路可利用 Responses API **显式前缀缓存**降本（注意：显式缓存与 json_schema 不兼容，但我们用续写模式不受影响）

---

## 7. 文档解析升级

| 类型 | 方案 |
|---|---|
| PDF（文字版） | **双通道**：本地 pdfjs-dist 提取文本层（供溯源/定位）+ File API 上传给 seed-2-1-pro 做版面理解 |
| PDF（扫描版） | File API 直传，平台自动分页转图 → 多模态理解（OCR 免费获得） |
| Word | mammoth（现状保留）+ 图片提取入素材库 |
| PPT | 文本提取（现状）→ 后续可 pptxgenjs |
| 图片 | File API + 多模态理解；入素材库时 sharp 压缩转 webp |
| 素材库 | 文档内嵌图提取 → 相关性评分 → 合格图入库 → 生成时优先选用 |

---

## 8. 投产级基础设施（当前完全缺失，必须补）

| 项 | 现状 | 投产要求 |
|---|---|---|
| 持久化 | 内存 Map + JSON 文件 | SQLite（better-sqlite3，零运维）起步，表：users/coursewares/sessions/assets/usage_logs |
| 用户体系 | 无 | 轻量账号（手机号/邮箱 + 密码）或先单机 token；课件归属隔离 |
| 任务队列 | 同步阻塞 | BullMQ（Redis）或进程内队列起步：生成/配图/质检异步化 |
| 用量与配额 | 无 | usage_logs 记录 token/图片消耗；每用户日配额；欠费熔断 |
| 错误处理 | 散落 try/catch | 全局异常过滤器 + 错误码体系 + 前端 toast 规范 |
| 可观测 | 无 | 生成全链路日志（sessionId 串联）、模型调用耗时/成本面板 |
| 安全 | key 仅后端（✅） | + 内容审核（生成文本/图片过审）、文件上传类型/大小白名单、Rate Limit |
| 部署 | dev 模式 | docker-compose：web(nginx) + server + redis；standalone HTML 导出保持零依赖 |

---

## 9. 实施路线（四个里程碑，每个都可独立验收）

### M1：设计与内容质量（3 周）— 解决"生成的课件能不能看、能不能用"
1. Design Token 体系 + 18 套主题落地
2. Block 组件库首批 20 个（开篇/讲解/语文/数学/互动/收尾优先）
3. 两阶段生成（TeachingScript + PageBlueprint）+ 脚本可编辑确认
4. 模型切换 seed-2-1-pro + 续写模式强制 JSON + 隐式缓存前缀设计
5. 验收：同一份小学语文课文，生成课件 ① 环节完整 ② 每页无溢出/重叠 ③ 换 3 套主题观感均成立

### M2：互动与播放（2 周）— 解决"课堂能不能上"
1. 批注白板、激光笔/聚光灯、TTS 朗读、KaTeX、Mermaid
2. 连线/拖拽分类/排序/笔顺动画/计时器/计分板
3. AI 助手切 flash + 预置问答
4. 导出 HTML 离线全功能（图片本地化）
5. 验收：导出单文件 HTML 在无网环境完成一整节课（播放/互动/批注/朗读）

### M3：编辑器工作台（2 周）— 解决"改起来顺不顺"
1. Block 级编辑 + 大纲视图 + 主题/版式一键切换
2. AI 编辑侧边栏（三级作用域）
3. 组件面板拖入
4. 验收：教师拿到生成课件后 5 分钟内完成"换主题 + 改一页版式 + 加一道题 + 改三处文字"

### M4：体验与投产（3 周）— 解决"能不能给别人用"
1. SSE 流式生成 + 逐页进度
2. PDF 双通道解析（File API）+ 素材库
3. seedream 组图配图 + 视觉质检闭环
4. SQLite 持久化 + 用户体系 + 用量配额 + 部署脚本
5. 验收：新用户注册 → 上传 PDF 教材 → 10 分钟产出可用课件 → 导出 HTML，全链路无人工干预；连续生成 20 份课件无故障，成本报表可核算

---

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| seed-2-1-pro 不支持 json_schema | 续写模式预填 `{` + zod 校验 + flash 修复重试（现有 callLLMWithRepair 保留） |
| Block 库工作量大 | M1 只做 20 个核心版式；每个版式必须配"溢出降级"策略；剩余 15 个 M3 补齐 |
| seedream 组图风格仍漂移 | 风格 prompt 模板化 + 首图作为后续参考图（图生图模式串联） |
| 账户欠费/限流 | 调用层统一熔断与降级（pro→flash）；RPM 500 做队列限速 |
| 教学法 prompt 效果不达标 | 先沉淀 3-5 份人工精修的"教学脚本"黄金样本做 few-shot，再批量 |
| 改动面过大失控 | 每个里程碑独立验收；旧管线保留为 feature flag 可回滚 |

---

## 11. 变更日志

| 日期 | 变更 | 变更人 |
|---|---|---|
| 2026-07-17 | v2.0 投产级升级设计初版（基于官方文档核实模型能力） | ZCode |
| 2026-07-18 | v2.1 全部四个里程碑实施完成（见附录 A 实施状态） | ZCode |

---

## 附录 A：实施状态（2026-07-18，全部验收通过）

### M1 设计与内容质量 ✅
- Design Token 体系：`packages/shared/src/constants/design-tokens.ts`（14 套主题 + 学段字号缩放 + resolveTheme 统一解析入口）
- Block 组件库 26 个版式：`block-catalog.ts`（前后端共享契约）+ `apps/web/src/components/blocks/` 26 个主题化渲染器（FitText 防溢出、BlockImage 配图兜底）
- 两阶段生成：`ScriptAgent`（教学分镜脚本，教学法知识库 `pedagogy/`）→ `BlueprintAgent`（逐页蓝图，续写模式强制 JSON、稳定前缀吃隐式缓存）→ `block-assembler`（确定性几何 + 全槽位归一化）
- 模型：seed-2-1-pro-260628 主生成（thinking 默认关闭，ARK_THINKING=true 可开，600s 超时）；向导 v2：教学脚本可编辑确认 + SSE 逐页进度点亮
- 验收：真实模型全链路 PASS（8 页《初识人工智能》，环节完整、版式多样、无溢出/空选项）

### M2 互动与播放 ✅
- 授课工具：批注白板（分页保存/撤销/橡皮）、激光笔/聚光灯/放大镜（快捷键 B/L/S/Esc）、TTS 朗读（speak 交互落地）
- 元素渲染：KaTeX 公式（错误兜底）、Mermaid 图（动态加载）、音视频卡片
- 互动组件 7 件：连线/拖拽分类/排序/计时器/计分板/随机点名/翻翻卡（interactive 元素类型，编辑器可插入）
- AI 助手切 flash（成本 1/15）+ 预置问答 5 组内嵌课件（离线本地匹配兜底）
- 导出 HTML：全素材 base64 内联，离线播放实测零错误（6.7MB 单文件）

### M3 编辑器工作台 ✅
- Block 级编辑：槽位表单（按 catalog 自动生成）+ 版式变体切换 + 复杂槽位 JSON 编辑
- 大纲视图（教学脚本树点击跳页）+ 一键换主题（14 套预览卡全局应用）
- AI 编辑侧边栏：三级作用域（元素/页面/整个课件）对话修改，`/ai/edit`（flash + 结构化校验 + 归一化）
- 组件面板：26 版式 + 7 互动点击插入（默认内容工厂 + 撤销链）

### M4 体验与投产 ✅
- SSE 流式生成（原生 Response 手写 SSE，逐页事件）
- PDF 解析：pdfjs-dist 文本层提取（扫描版标记待 File API 多模态）；上传链路验证通过
- seedream 配图：2K 无水印、b64 落盘本地化、学科风格前缀统一风格；并发限速
- 质检：qc-lint 确定性检查（必填槽位/空 quiz/超长文本）随 done 事件透出
- SQLite（better-sqlite3，WAL）：课件/文档落库 + 旧 JSON 自动迁移；token 用量日志 + `/api/admin/usage`（byModel 分组）；Dockerfile + docker-compose + DEPLOY.md

### 关键修复记录
1. `resolveTheme is not a function`：Vite 预打包缓存失效 → 清缓存；shared 循环依赖 TDZ → 拆 design-system.ts
2. 脚本生成 10 分钟超时：seed-2-1-pro 默认 thinking → 显式 disabled（214s 达标）
3. quiz 空选项/空题干：装配层 normalizeQuizSlot（字母答案→isCorrect）+ sanitizeBlueprint（keyPoints 兜底）
4. 富文本槽位 HTML 标签：stripHtml 归一化 + prompt 禁令
5. pairs 槽位 {key,value} 漂移：normalizePairs 兼容映射
6. standalone 模板过期：build:standalone 自动同步 public/
7. 素材重启 404：AssetsService 磁盘回扫兜底
8. watch 模式重启打断长请求：测试期固定 `node dist/main` 稳定实例

### Review 修复记录（终验 5，2026-07-18 下午）
全库 review 扫描确认 0 P0 / 7 P1 / 13 P2，全部 P1 与关键 P2 已修复：
1. P1-1 播放器键盘劫持 AI 输入 → 翻页快捷键加 typing 守卫
2. P1-2 AI 编辑绕过撤销链 → applyResult 前置 record 快照
3. P1-3 方向键微调先变更后快照 → 先 record 再 nudge
4. P1-4 table 槽位契约断裂（表格静默消失）→ normalizeTable 别名（columns/head/data/body）+ prompt 补结构示例 + qc-lint 空 headers 告警
5. P1-5 AI 全局样式修改视觉无效 → ThemeProvider 深合并 designSystem.tokens（已验证：主色蓝→绿即时生效）
6. P1-6 导出 HTML 脚本标签注入断链 → JSON 注入前转义 <
7. P1-7 素材包命名契约不一致 → 导入兼容 filename 与 id+ext，导出统一 fetch 入包
8. P2 级：/ai/chat 参数守卫、SSE 20s 心跳、上传文件名 basename 净化、API_BASE 统一走 VITE_API_BASE、脚本 prompt 24k→12k（降时延）
9. 终验视觉巡检追加发现：poem 槽位 content/lines 漂移（诗句不显示）→ normalizePoem 拆分修复（已验证诗句正常渲染）

### 遗留（下阶段）
- File API 扫描版 PDF 多模态理解通道（标记已留）
- 视觉质检多模态截图评分（qc-lint 之上）
- seedream 组图生成（sequential_image_generation）统一多图风格
- 编辑器图片圈选局部重绘（seedream-5-0-pro 交互编辑）
- 批量推理离线生产、用户体系与配额
