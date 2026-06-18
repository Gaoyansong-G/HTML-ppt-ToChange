# 阶段 2 修改记录：编辑器雏形

> 阶段 2 目标：搭建可视化编辑器骨架，能添加/删除页面、选中元素、修改基础属性、实时预览。

## 完成情况

- **完成日期**：2026-06-14
- **自测结果**：✅ 通过 Playwright E2E 测试
- **测试脚本**：`apps/web/scripts/test-editor.mjs`

---

## 新增文件

### 编辑器核心

| 文件 | 说明 |
|------|------|
| `apps/web/src/editor/Editor.tsx` | 编辑器主布局：顶部工具栏 + 左中右三栏 + 底部时间轴 |
| `apps/web/src/editor/SlideSidebar.tsx` | 左侧 Slides 面板：缩略图、新增、删除、上移、下移 |
| `apps/web/src/editor/Canvas.tsx` | 中间画布：渲染当前页、元素选中、拖拽移动、缩放适配 |
| `apps/web/src/editor/PropertyPanel.tsx` | 右侧属性面板：编辑 Slide 属性 / 元素位置尺寸样式文本 |
| `apps/web/src/editor/AnimationTimeline.tsx` | 底部简化时间轴：展示/添加入场动画 |

### 状态管理

| 文件 | 说明 |
|------|------|
| `apps/web/src/stores/editor.store.ts` | Zustand + Immer 管理 Courseware、当前页、选中元素、预览状态 |
| `apps/web/src/stores/history.store.ts` | Zustand + Immer 实现 Undo/Redo 历史栈 |

### 测试

| 文件 | 说明 |
|------|------|
| `apps/web/scripts/test-editor.mjs` | Playwright E2E 自测脚本 |

---

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/web/src/router.tsx` | 新增 `/editor` 路由 |
| `apps/web/src/App.tsx` | 新增"✎ 编辑示例课件"入口 |
| `apps/web/src/player/InteractionController.ts` | 修正状态机事件名为 `interaction.id` 大写形式 |
| `apps/web/src/examples/example-courseware.ts` | 状态机事件名改为 `INT_REVEAL` |
| `packages/shared` | 重新构建以同步类型 |

---

## 自测覆盖点

1. ✅ 编辑器页面加载，显示四栏布局
2. ✅ 左侧 Slides 面板显示两页缩略图
3. ✅ 选中文本元素，右侧属性面板显示位置/尺寸/样式
4. ✅ 修改文本内容，画布实时更新
5. ✅ 修改文字颜色，画布实时更新
6. ✅ 点击"新增页面"，页面数量从 2 变为 3
7. ✅ 点击"撤销"，页面数量恢复为 2
8. ✅ 点击"重做"，页面数量恢复为 3
9. ✅ 浏览器控制台无致命错误（除 React HMR transient warning 外）

---

## 修复记录

### 2026-06-14：修复编辑器无法保存

- **现象**：编辑器没有保存按钮，用户修改后无法持久化。
- **修复**：在 `Editor.tsx` 顶部工具栏新增"保存"按钮，点击后将当前 `courseware` POST 到 `/api/courseware`；新增 `isSaving` / `saveMessage` 状态，保存成功后提示用户。
- **验证**：`test-ai-pipeline.mjs` 进入编辑器环节无错误，手动点击保存可成功写入后端。

---

## 已知问题与后续优化

1. **React HMR transient warning**：首次加载 `/editor` 时偶发 `Invalid hook call` 警告，不影响功能，可能与 Vite HMR + Zustand 初始化有关，后续排查。
2. **画布缩放**：当前按容器等比缩放整个画布，缩放控件后续补充。
3. **元素缩放/旋转**：当前仅支持拖拽移动，缩放和旋转控件后续补充。
4. **属性面板**：仅支持文本和基础样式， Quiz、Image 等类型的高级属性后续补充。
5. **动画时间轴**：当前仅展示/添加入场动画，编辑 duration/delay/easing 等功能后续补充。
6. **历史记录粒度**：当前每次操作前手动 `record()`，后续可封装为自动记录中间件。

---

## 运行方式

```bash
# 启动前端开发服务器
cd courseware-agent
pnpm dev

# 在新终端运行自测
cd apps/web
node scripts/test-editor.mjs
```
