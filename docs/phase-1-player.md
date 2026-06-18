# 阶段 1 修改记录：播放器原型

> 阶段 1 目标：让示例课件能在浏览器里真正播放出来，支持翻页、元素动画、点击交互。

## 完成情况

- **完成日期**：2026-06-14
- **自测结果**：✅ 通过 Playwright E2E 测试
- **测试脚本**：`apps/web/scripts/test-player.mjs`

---

## 新增文件

### 前端播放器核心

| 文件 | 说明 |
|------|------|
| `apps/web/src/player/Player.tsx` | 播放器主组件，管理翻页、转场、控制栏 |
| `apps/web/src/player/SlideView.tsx` | 单页渲染组件，初始化时间轴和交互 |
| `apps/web/src/player/TimelineController.ts` | GSAP 时间轴控制器，编排元素入场/出场动画 |
| `apps/web/src/player/TransitionController.ts` | 页面转场控制器，支持 fade/slide/zoom/flip/wipe/parallax |
| `apps/web/src/player/InteractionController.ts` | 点击交互控制器，处理 show/hide/toggle/animate/navigate 等 action |
| `apps/web/src/lib/gsap/index.ts` | GSAP 统一入口，集中注册插件 |
| `apps/web/src/router.tsx` | 前端路由配置，新增 `/player` 路由 |

### 元素渲染器

| 文件 | 说明 |
|------|------|
| `apps/web/src/player/elements/TextElement.tsx` | 文本元素渲染 |
| `apps/web/src/player/elements/ShapeElement.tsx` | 形状元素渲染（矩形/圆形/三角形/箭头等） |
| `apps/web/src/player/elements/ImageElement.tsx` | 图片元素渲染（含资源缺失占位） |
| `apps/web/src/player/elements/QuizElement.tsx` | 测验元素渲染（单选/多选/填空/显隐） |
| `apps/web/src/player/elements/index.tsx` | 元素渲染分发器 |

### 测试与示例

| 文件 | 说明 |
|------|------|
| `apps/web/scripts/test-player.mjs` | Playwright E2E 自测脚本 |
| `apps/web/e2e/` | 预留 E2E 测试目录（Playwright 正式测试后续迁移至此） |

---

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/web/src/main.tsx` | 使用 `AppRouter` 替代直接渲染 `App` |
| `apps/web/src/App.tsx` | 添加"▶ 播放示例课件"入口链接 |
| `apps/web/src/examples/example-courseware.ts` | 调整 el-answer 动画为手动触发，修复点击显隐逻辑 |
| `apps/web/package.json` | 新增 `playwright` 和 `@playwright/test` 开发依赖 |

---

## 自测覆盖点

1. ✅ 首页加载正常，显示"播放示例课件"按钮
2. ✅ 点击进入 `/player` 路由
3. ✅ 播放器显示第一页标题"北京的春节"
4. ✅ 第一页 entrance 动画按顺序播放（标题 scale-in、副标题 slide-up）
5. ✅ 点击"下一页"切换到第二页
6. ✅ 第二页显示"春节从什么时候开始？"
7. ✅ 点击"点击查看答案"按钮，答案框显示
8. ✅ 浏览器控制台无错误

---

## 修复记录

### 2026-06-14：修复切换 slide 闪烁

- **现象**：点击"下一页"时新 slide 元素先闪现再播放入场动画。
- **根因**：
  1. `TimelineController.buildTimeline` 在动画开始前把所有元素 `style.opacity` 重置为原始值，导致视觉上从 1 跳到 0 再播放入场。
  2. React 复用 SlideView 组件实例，GSAP 状态残留。
- **修复**：
  1. `TimelineController.ts`：移除 opacity 重置，仅清理 transform 相关属性。
  2. `Player.tsx`：给每个 slide 容器增加 `key={slide.id}`，确保切换时重新创建 SlideView。
- **验证**：`test-player.mjs` 与 `test-ai-pipeline.mjs` 播放器环节无闪屏。

---

## 已知问题与后续优化

1. **转场动画**：当前 slide 转场已实现 fade/slide/zoom/flip/wipe/parallax，但 morph 转场尚未实现。
2. **动画类型**：`draw`、`typewriter`、`morph` 等复杂动画当前回退为 fade。
3. **播放/暂停**：控制栏已预留位置，当前版本移除播放/暂停按钮，后续结合 SlideView timeline 控制补齐。
4. **Quiz 组件**：当前仅实现了 reveal/单选交互，填空题和拖拽题需后续扩展。
5. **图片资源**：ImageElement 已处理资源缺失占位，真实图片资源加载待后端资源模块完成后接入。
6. **状态机事件映射**：当前通过 `interaction.payload.event` 或 interaction.id 大写映射触发状态机事件，后续考虑更明确的事件命名规范。

---

## 运行方式

```bash
# 启动前端开发服务器
cd courseware-agent
pnpm dev

# 在新终端运行自测
cd apps/web
node scripts/test-player.mjs
```

自测脚本会自动打开无头 Chromium，访问首页 → 进入播放器 → 验证两页内容 → 点击显示答案 → 输出结果。
