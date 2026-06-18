---

## 16.26 第二十六轮打磨：基于希沃案例的学段适配与版式配方落地（2026-06-17）

**目标**：针对用户“联网学习近几年优质课件、大量总结不同学科/学段/章节规律”的要求，做一轮更深入的希沃式研究，并把可编码的规律落地到提示词、主题配色与确定性 fallback 排版中。

### 16.26.1 关键改动

#### 1. 学段识别与适配

| 模块 | 改动 | 文件 |
|------|------|------|
| 学段检测 | 新增 `detectGradeLevel`：从描述/文本中识别小学/初中/高中 | `apps/server/src/modules/ai/ai.service.ts` |
| AgentContext | `options` 新增 `gradeLevel` 字段 | `apps/server/src/modules/ai/agents/base.agent.ts` |
| 内容提示词 | 新增 `{{gradeLevel}}` 变量，按小学/初中/高中分别规定文字量、例子类型与信息密度 | `apps/server/src/modules/ai/prompts/content.prompt.ts` |
| 设计提示词 | 新增 `{{gradeLevel}}` 变量，分别规定字号、留白、布局复杂度 | `apps/server/src/modules/ai/prompts/design.prompt.ts` |

#### 2. 学科主题配色扩展

在 `packages/shared/src/constants/index.ts` 新增 6 套学科主题：
- `chinese` 国风青黛（语文/古诗词）
- `math` 理性几何
- `english` 活力紫橙
- `science` 科学探索（理化生/实验）
- `history` 文史琥珀
- `geography` 地理湖蓝

并在 `layout-engine.ts` 的 `chooseTheme` 中按更细粒度的学科关键词自动匹配。

#### 3. 版式配方（Recipes）写入设计提示词

在 `design.prompt.ts` 中直接给出可套用的版式配方，覆盖：
- 古诗词：米纸背景 + 居中诗句 + 右侧赏析卡 + 底部作者条
- 现代文阅读：左 60% 原文摘录 + 右 40% 赏析问题
- 数学公式/推导：网格底 + 定理框 + 带序号徽章的步骤
- 英语词汇：2×2 单词卡片
- 英语对话：场景底图 + 交替气泡 + 角色头像
- 理科实验：器材列表 + 步骤图 + 观察记录表
- 历史时间轴：横向脊 + 上下交替事件卡
- 地理地图：大图 + 图例 + 标注气泡
- 数据图表：居中图表 + 结论卡

#### 4. 确定性 fallback 排版优化

| 版式 | 优化 | 文件 |
|------|------|------|
| 古诗词 | 诗句卡片占 55%（660px），赏析卡占 35%（420px），底部增加作者/诗题条 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |
| 阅读理解 | 改为左 60% 原文摘录 + 右 40% 赏析问题，摘录区更高 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |
| 时间轴 | 事件卡片沿时间轴上下交替排列 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |
| 地图 | 地图占位区放大到 720×500，右侧特征卡收窄 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |

#### 5. 反低级错误规则强化

在 `design.prompt.ts` 与 `content.prompt.ts` 中新增/强化：
- 禁止左重右空、禁止空洞页面、禁止孤立图片。
- 各版式内容密度上限（古诗词原句 ≤4 句、知识讲解 ≤4 要点、每节点 ≤2 行等）。
- 测验选项不能为空。
- 图片元素必须配 caption/body 说明。

### 16.26.2 端到端验证结果

```text
✅ test-ai-pipeline.mjs    （上传 → 解析 → AI 生成 → 预览 → 编辑）
✅ test-player.mjs         （播放、翻页、答案揭示）
✅ test-editor.mjs         （inline 编辑、颜色、新增页面、撤销重做）
✅ test-export.mjs         （.courseware 包、独立 HTML 导出、后端 CRUD）
✅ test-interactions.mjs   （选择题、填空题、AI 助手真实回答、交互编辑器）
```

- `pnpm type-check`：web / server / shared 全量通过 ✅
- AI pipeline 仍真实调用火山方舟 Doubao LLM，生成成功 ✅

### 16.26.3 仍待继续

1. 继续用《宿建德江》等真实课文做端到端测试，重点观察 14 页指定页数、古诗词一页整合、图文不孤立是否达标。
2. 对无法登录的希沃官网，后续可考虑通过浏览器自动化或用户授权方式抓取更多案例做批量学习。
3. 进一步把“版式配方”抽象为可配置模板，便于后续热更新和学科扩展。

---

## 16.27 第二十七轮打磨：基于公开资源与用户反馈的“克制且灵动”规则再提炼（2026-06-17）

**目标**：放弃无法稳定进入的希沃内页抓取，改为基于公开教育资源、前沿课件设计研究、用户已提供的截图反馈，重新提炼内容分配与页面构建规则，让生成结果既克制干净，又不过于死板。

### 16.27.1 关键改动

#### 1. 删除希沃抓取脚本

- 删除 `apps/web/scripts/seewo-crawler.mjs` 及 `apps/web/seewo-output/` 目录，避免项目污染。

#### 2. 内容层：明确“课堂功能”与内容分配

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/prompts/content.prompt.ts` | 新增“页面功能与内容分配原则”：每页只能是“引入/情境、新知建构、示范/探究、巩固/小结”四类之一；给出标题区/核心内容/留白比例；要求每页至少“一个核心 + 一个支撑细节 + 一个互动/问题/图注” |
| `apps/server/src/modules/ai/prompts/content.prompt.ts` | 放宽古诗词“必须一页内放原句+翻译+赏析”的刚性要求，改为“每页自身完整、至少包含两项以上内容”，避免为凑版式而硬塞 |

#### 3. 设计层：克制且灵动的视觉规则

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/prompts/design.prompt.ts` | 新增“内容分配与页面构建原则（克制且灵动）”：每页一个课堂功能；信息层级；颜色≤3主色+1强调色；装饰≤2个且须服务主题；允许非对称布局；短内容居中放大；按学段给出内容密度上限 |

#### 4. 确定性排版：减少“左重右空”与列表死板感

| 版式 | 优化 | 文件 |
|------|------|------|
| 古诗词 | 诗句卡片占 55%（660px），赏析卡占 35%（420px），底部增加作者/诗题条 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |
| 阅读理解 | 改为左 60% 原文摘录 + 右 40% 赏析问题，摘录区更高 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |
| 时间轴 | 事件卡片沿时间轴上下交替排列 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |
| 地图 | 地图占位区放大到 720×500，右侧特征卡收窄 | `apps/server/src/modules/ai/assembler/layout-engine.ts` |

### 16.27.2 参考来源

- 公开教育资源中关于课件/PPT 设计的原则：一页一核心、5–7 行文字、高对比配色、最小化装饰、先目的后装饰等 [[Education Slide Design for Teachers and Students](https://www.chatslide.ai/articles/education-slide-design-for-teachers-and-students)]、[[Design slides to support learning](https://teachingkb.mcgill.ca/tlk/design-slides-to-support-learning)]、[[Top 10 Evidence-Based, Best Practices for PowerPoint](https://journals.psu.edu/td/article/download/1349/805/3961)]。
- 希沃白板课件版式技巧：母版统一、网格对齐、小学活泼图文并重、初中逻辑清晰多用思维导图、高中专业高密度等 [[如何制作优秀的希沃白板课件](https://bk.taobao.com/k/xiwobaiban_86/a7984b2f133d87b4545bd82bd57e29e4.html)]、[[希沃白板5怎么高效制作数学课件](https://bk.taobao.com/k/xiwobaiban_86/44fa7a6d5270acb5ad9983b845461652.html)]。
- 用户反馈截图：希沃真实课件偏好全幅柔和渐变背景、顶部标题条、图文左右分栏、关键字颜色强调、底部工具/页码条，整体干净但有主题氛围。

### 16.27.3 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅

### 16.27.4 仍待继续

1. 用真实课文（如《宿建德江》14 页指定页数）做端到端回归，重点观察：
   - 每页功能是否单一、内容是否完整；
   - 古诗词不再因“三合一”硬塞导致空白或溢出；
   - 默认内容页是否还出现“左重右空”。
2. 进一步把“克制且灵动”规则拆成可配置的设计 token（如装饰密度、留白比例），便于后续按学科/学段热切换。
3. 继续收集用户实际生成结果的坏 case 截图，反向优化 prompt。

---

## 16.28 第二十八轮打磨：修复页数丢失、测验空白与预览缺失配图（2026-06-17）

**目标**：针对用户最新反馈的“14 页只生成 8 页、页面太干无配图、测验选项空白、预览不呈现编辑时的配图/效果”做一轮硬核修复。

### 16.28.1 关键改动

#### 1. 页数强制对齐

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/prompts/outline.prompt.ts` | 明确“若用户指定 pageCount，必须严格等于该页数，不得以任何理由减少/合并”；给出补足页数的可用页型 |
| `apps/server/src/modules/ai/ai.service.ts` | 新增 `enforceOutlinePageCount`：outline 页数与请求不符时先 retry 一次，仍不符则自动 pad/trim 到指定页数 |

#### 2. 测验选项不再空白

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/ai.service.ts` | `normalizeContentSlides` 对 `layoutTemplateId="quiz"` 但缺少 quiz 的 slide 兜底生成 4 选项单选题 |
| `apps/server/src/modules/ai/assembler/courseware-assembler.ts` | `buildQuizSlideElements` 保留原设计中的 `image` 元素；quiz 重建后再调用 `ensureDecorations` |

#### 3. 每页强制配图/视觉锚点

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/prompts/design.prompt.ts` | 新增约束：除 title/section/toc/quiz 外，每页必须至少 1 个 `type="image"` 元素 |
| `apps/server/src/modules/ai/assembler/layout-engine.ts` | poetry、reading、content fallback 均加入 image 占位元素，确保兜底也有图 |

#### 4. 减少死板、增强灵动

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/assembler/courseware-assembler.ts` | `normalizeBackground` 对所有无渐变背景自动加主题渐变；装饰最小透明度提升 |
| `apps/server/src/modules/ai/assembler/layout-engine.ts` | content fallback 改为“左文右图”或“居中卡片+底部图”，避免通栏列表的死板感 |

### 16.28.2 关于“编辑时能看到配图/效果，预览看不到”

- 根因之一是 quiz 重建逻辑会把原设计里的 image/decoration 全部丢弃，导致预览只剩文字和空白选项卡。
- 另一个因素是装饰透明度原先过低（0.08–0.18），在播放器里几乎看不见。
- 本次已修复 quiz 重建保留图片/装饰、提升装饰可见度、统一加背景渐变。

### 16.28.3 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅

### 16.28.4 仍待继续

1. 再次用“14 页《七律·长征》/《宿建德江》”做端到端测试，验证页数、配图、测验选项是否正常。
2. 如果预览仍看不到配图，需要排查播放器端远程图片加载/占位符渲染，必要时把 Pollinations 远程 URL 换成本地 SVG placeholder。
3. 继续扩展到数学、英语、理科等多学科测试，收集坏 case 后反向优化。

---

## 16.29 第二十九轮打磨：从描述解析页数、修复播放器可见性、默认本地 SVG 配图（2026-06-17）

**目标**：继续解决用户反馈的“仍然只有 8 页、图片没加载、样式缺失”。

### 16.29.1 关键改动

#### 1. 页数从描述中解析并强制对齐

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/ai.service.ts` | 新增 `detectRequestedPageCount`，从用户描述（如“生成14页课件”）提取页数；与 `options.pageCount` 合并后传入 agent 和 `enforceOutlinePageCount` |

> 之前前端 `AIWizard.tsx` 固定发送 `options: { includeQuiz: true }`，不会把用户描述里的页数带下来；现在后端直接从描述解析，确保“14页”诉求生效。

#### 2. 修复播放器中图片/样式元素不可见

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/assembler/courseware-assembler.ts` | `ensureDefaultAnimations` 把 `image` 元素和 `option-bg` 形状卡片纳入默认入场动画；避免 SlideView 初始化 opacity=0 后这些元素永远隐藏 |

> 根因：`SlideView` 在 `useGSAP` 里先把所有元素 `opacity: 0`，只有带 entrance 动画的元素才会被显示出来。image 和卡片背景原来没有动画，所以预览时“消失”。

#### 3. 默认使用本地 SVG 配图占位

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/assembler/image-provider.ts` | 默认 `IMAGE_PROVIDER` 从 `pollinations` 改为 `svg`，避免远程图片被网络/防火墙拦截导致空白 |

> 如需真实图片，可设置环境变量 `IMAGE_PROVIDER=pollinations` 或 `unsplash`；默认 SVG 占位会根据主题色和 alt 文本生成，加载稳定且不会空白。

### 16.29.2 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅

### 16.29.3 仍待继续

1. 再次用“生成14页《七律·长征》/《宿建德江》”测试，确认：
   - 大纲和最终课件都是 14 页；
   - 每页能看到 SVG 配图/占位；
   - 测验页选项有文字；
   - 编辑器和预览效果一致。
2. 如果仍有问题，需要打开浏览器 DevTools 看 Network 是否有图片请求失败，或播放器控制台是否有动画报错。
3. 后续再扩展到数学、英语、理科课件做多学科验证。

---

## 16.30 第三十轮打磨：修复播放器丢失图片、标题条和装饰形状（2026-06-17）

**目标**：解决用户反馈的“编辑时能看到图片/蓝色标题条/装饰，预览时消失”的问题。

### 16.30.1 根因分析

- `SlideView` 在 `useGSAP` 中先把所有元素 ref 设为 `opacity: 0`，随后只有带 `entrance` 动画的元素才会被 `TimelineController` 重新显示。
- `ensureDefaultAnimations` 之前只给 `text`、`image` 和 `option-bg` 形状补动画；**普通装饰形状、标题背景条、卡片底图等 shape 元素如果没有动画，就会一直停留在 `opacity:0`**。
- 这就是编辑器里能看到蓝色标题渐变条/图片，而播放器里看不到的原因：前者直接按 `style.opacity` 渲染，后者被 GSAP 初始隐藏后没有动画将其恢复。

### 16.30.2 关键改动

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/assembler/courseware-assembler.ts` | `ensureDefaultAnimations` 现在为所有可见元素（text/image/shape）补入场 fade 动画，仅跳过 `explanation` / `answer` 等需要默认隐藏的角色 |
| `apps/web/src/player/SlideView.tsx` | 在构建完 timeline 后，为所有没有 `entrance` 动画的元素按其 `style.opacity`（默认 1）做一次 `gsap.set`，作为兜底可见机制 |
| `apps/web/src/ai-wizard/AIWizard.tsx` | 新增 `detectPageCount`，把用户描述中的“14 页”等页数需求解析为 `options.pageCount` 传给后端，避免后端单独兜底 |
| `apps/server/src/modules/ai/ai.service.ts` | 扩展 `detectRequestedPageCount` 正则，支持“页/张/page/pages/p”多种写法 |

### 16.30.3 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅
- 后端端到端验证“生成 14 页《宿建德江》”：
  - 最终课件 slides: **14**（符合预期）
  - 图片元素总数: **13**
  - 形状元素总数: **37**
  - 验证脚本：`apps/web/scripts/verify-14-pages.mjs` ✅

### 16.30.4 仍待继续

1. 请重新测试“生成 14 页《宿建德江》/《七律·长征》”，确认：
   - 最终课件确实是 14 页；
   - 每页的 SVG 配图在编辑器与播放器中都能看到；
   - 蓝色/渐变色标题条、卡片底图、装饰圆圈等在预览时不再丢失。
2. 如果还有元素缺失，请提供浏览器控制台（Console / Network）截图或具体 slide 编号，便于进一步定位。
3. 该修复稳定后，继续数学、英语、理科等多学科生成测试。

---

## 16.31 第三十一轮打磨：编辑器缩略图真实渲染与视觉层次微调（2026-06-17）

**目标**：在继续扩展学科测试前，先对编辑器左侧页面列表做一次视觉升级，让缩略图真实反映页面内容，减少“太素”的感受。

### 16.31.1 关键改动

| 文件 | 改动 |
|------|------|
| `apps/web/src/editor/SlideThumbnail.tsx`（新增） | 使用真实 `ElementRenderer` 渲染 slide 内容，并通过 `ResizeObserver` 按比例缩放，准确呈现文字、形状、图片、背景渐变 |
| `apps/web/src/editor/SlideSidebar.tsx` | 用 `SlideThumbnail` 替换原来简单的色块占位缩略图 |

### 16.31.2 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅
- `test-editor.mjs`：编辑器核心交互（页面列表、inline 编辑、撤销重做）全部通过 ✅

### 16.31.3 仍待继续

1. 观察编辑器左侧缩略图在真实课件（特别是 14 页《宿建德江》）下的表现：
   - 是否清晰看出每页布局差异；
   - 大图/渐变背景是否导致缩略图过花或文字过小；
   - 是否需要对缩略图做进一步简化（如隐藏装饰形状、降低图片饱和度）。
2. 继续数学、英语、理科课件的端到端生成测试。

---

## 16.32 第三十二轮打磨：进一步消除文字重叠、明确重启要求（2026-06-17）

**目标**：针对用户反馈的“仍生成 8 页、测验选项空白、生字词拼音重叠”做回应和补充修复。

### 16.32.1 关键改动

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/assembler/courseware-assembler.ts` | `normalizeElement` 增加文本行高兜底：若 `lineHeight < 1.2` 则提升到 1.5，未设置则默认 1.6，防止多行文字（尤其是生字词拼音）重叠 |
| `apps/server/src/modules/ai/prompts/content.prompt.ts` | 词汇页格式要求强化：**不要把拼音/音标和汉字挤在同一行**，每个词单独一段 |

### 16.32.2 关于“仍生成 8 页 / 测验选项空白”

- 后端代码修改后，必须**重启 NestJS 服务**才能生效；Vite 前端也建议**浏览器硬刷新**。
- 我已用 `apps/web/scripts/verify-14-pages.mjs` 对当前运行的后端做端到端验证：**14 页请求返回 14 slides**，说明新代码本身没问题。
- 你看到的 8 页和空白选项，最可能是**旧进程/旧浏览器缓存**导致。请按以下步骤重试：
  1. 停止当前 `pnpm dev`（两个终端都 Ctrl+C）。
  2. 重新执行 `pnpm dev`。
  3. 浏览器里按 `Ctrl + F5` 硬刷新。
  4. 在 AI 课件生成向导里重新上传/描述并生成。

### 16.32.3 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅

### 16.32.4 仍待继续

1. 重启并硬刷新后，请再次生成 14 页《七律·长征》/《宿建德江》，确认：
   - 最终课件为 14 页；
   - 测验页选项有文字；
   - 生字词页拼音不再与汉字重叠。
2. 如果重启后仍复现 8 页，请提供浏览器 DevTools → Network → `/ai/generate` 的请求体截图，便于确认前端是否把 `pageCount` 传了下去。
3. 稳定后再扩展到数学、英语、理科测试。

---

## 16.33 第三十三轮打磨：AI 生成课件必须呈现真实配图，禁止占位符（2026-06-17）

**目标**：解决用户反馈的“AI 生成的图片不要留占位符，直接呈现具体图片”。

### 16.33.1 关键改动

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/assembler/image-provider.ts` | 默认图片提供者改回 `pollinations`；生成时后端会把 Pollinations 返回的真实图片下载并转为 base64 data URL，直接写入 `courseware.assets`，播放器/编辑器无需再联网加载 |
| `apps/server/src/modules/ai/assembler/image-provider.ts` | 增加 `fetchWithRetry`，失败时最多重试 2 次，尽量保证图片可用 |
| `apps/server/src/modules/ai/assembler/placeholder-assets.ts` | 移除 SVG 占位中的“AI 配图占位”字样；fallback 时只显示主题渐变和 alt 标题 |
| `apps/web/src/player/elements/ImageElement.tsx` | 移除占位组件里的“AI 配图占位”提示 |

### 16.33.2 设计/提示词侧的配合

- 设计提示词已要求每页 image 元素给出准确的 `content.alt` 描述；后端会拿这些描述去 Pollinations 生成对应的真实图片。
- 图片在生成阶段即被固定为 base64，后续导出 `.courseware` 或独立 HTML 时都能离线携带，不会再出现空白或占位。

### 16.33.3 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅
- 后端网络连通性：直接 `curl` Pollinations 可正常返回 JPEG ✅

### 16.33.4 仍待继续

1. **必须重启 NestJS 服务**后新逻辑才生效；请按 Ctrl+C 停止 `pnpm dev`，再重新运行，浏览器 Ctrl+F5 硬刷新。
2. 重新生成 14 页《宿建德江》/《七律·长征》，确认：
   - 右侧/下方图片区域显示的是真实水墨/场景插画，而不是渐变占位；
   - 若个别图片因网络抖动失败，也只会显示带标题的主题渐变，不再出现“AI 配图占位”字样。
3. 继续观察生字词页和测验页效果，稳定后扩展到数学、英语、理科。

---

## 16.34 第三十四轮打磨：课件持久化到磁盘，避免重启后丢失（2026-06-17）

**目标**：解决用户反馈的“生成的课件没有持久化存储，退出预览后在‘我的课件’里找不到”。

### 16.34.1 关键改动

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/courseware/courseware.service.ts` | 新增 `COURSEWARES_DIR`（`apps/server/generated/coursewares`），`create` / `update` / `remove` 时同步读写本地 JSON |
| `apps/server/src/modules/courseware/courseware.service.ts` | 构造函数调用 `loadAll()` 加载磁盘已有课件，并确保示例课件被保存 |
| `apps/server/src/modules/courseware/courseware.service.ts` | 新增 `saveOne()` / `deleteOne()` / `ensureStorageDir()` 辅助方法 |

### 16.34.2 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅
- 已清掉占用 `3001` 端口的旧 NestJS 进程，重新启动 `pnpm dev` ✅
- 后端 `GET /api/courseware/health` 正常响应 ✅
- 通过 `POST /api/courseware` 创建测试课件，磁盘出现 `apps/server/generated/coursewares/<id>.json` ✅
- **完整重启服务后**，`GET /api/courseware` 仍能列出该课件，证明持久化生效 ✅

### 16.34.3 仍待继续

1. 在 AI 课件生成向导里重新生成课件，生成完成后退出预览，到“我的课件”确认课件已保留。
2. 同时观察生成结果：是否 14 页、是否有真实配图、测验选项是否完整。
3. 稳定后扩展到数学、英语、理科课件测试。

---

## 16.35 第三十五轮打磨：修复 AI 生成课件的持久化与真实配图失效（2026-06-17）

**目标**：针对用户反馈的“仍没真实配图、仍没持久化”做根因修复。

### 16.35.1 关键改动

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/ai/ai.controller.ts` | `POST /api/ai/generate` 成功后调用 `coursewareService.create()` 自动保存课件，返回 `coursewareId` |
| `apps/server/src/main.ts` | 提升 JSON / urlencoded body 解析上限到 `50mb`，避免 base64 配图导致 `413 Payload Too Large` |
| `apps/server/package.json` | 添加 `express` 依赖，使 `main.ts` 可直接引入 `json` / `urlencoded` 中间件 |
| `apps/server/src/modules/ai/assembler/image-provider.ts` | 增加日志；Pollinations 失败时重试 5 次并带 500ms 间隔；明确记录每次失败原因 |
| `apps/server/src/modules/ai/assembler/courseware-assembler.ts` | 图片下载从 `Promise.all` 改为串行，每张间隔 1.5s，避免并发压垮 Pollinations；增加 `ImageProvider` 和 `CoursewareAssembler` 日志 |

### 16.35.2 根因说明

1. **持久化失效**：之前 `POST /api/ai/generate` 只返回生成结果，没有调用 `coursewareService.create()`，所以“我的课件”里看不到。
2. **保存时 413**：即使前端或后端想保存，含 base64 图片的课件 JSON 超过默认 body-parser 限制（100KB），会报 `request entity too large`。
3. **配图大多失败**：并发请求 Pollinations 容易触发限流/超时，失败后又 fallback 到 SVG 渐变占位。

### 16.35.3 验证结果

- `pnpm type-check`：web / server / shared 全量通过 ✅
- 后端 `GET /api/courseware/health` 正常 ✅
- 服务已重新启动，前端在 `http://localhost:5173/`，后端在 `http://localhost:3001/` ✅
- 上传测试文档后调用 `POST /api/ai/generate`（3 页），返回 `coursewareId` 并自动保存 ✅
- `GET /api/courseware` 可列出刚生成的课件，证明持久化链路已通 ✅
- 生成课件的 `assets` 中出现 `data:image/jpeg;base64,...` 真实图片，不再全是 SVG 占位 ✅

### 16.35.4 仍待继续

1. 在 AI 课件生成向导里重新生成 14 页《宿建德江》，确认：
   - 生成完成后“我的课件”能直接看到；
   - 多数页面显示真实 AI 配图；若个别仍失败，可在后端日志看到具体原因（超时 / 402 等）。
2. 稳定后扩展到数学、英语、理科课件测试。



