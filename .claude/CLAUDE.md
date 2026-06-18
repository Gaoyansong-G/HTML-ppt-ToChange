# GSAP 开发参考

本项目已安装官方 GSAP AI skills：`.claude/skills/gsap-skills`。

修改 GSAP 相关代码（`TimelineController`、`TransitionController`、`SlideView`、`Player`、`Canvas`）时应参考：

- `skills/gsap-react/SKILL.md`：React 中使用 `useGSAP` hook、scope、cleanup
- `skills/gsap-timeline/SKILL.md`：timeline 编排、position 参数
- `skills/gsap-performance/SKILL.md`：性能优化、transform/opacity 优先、will-change
- `skills/gsap-core/SKILL.md`：`gsap.to/from/fromTo/set`、easing、stagger

当前项目中的关键实践：
- 播放器转场使用 `x/y/scale/rotationY/opacity`，避免布局属性动画
- 元素入场动画使用 transform + opacity
- 切换 slide 时给 slide 容器加 `key={slide.id}`，避免 React 复用实例导致 GSAP 状态残留
- `TimelineController` 不再在动画前重置 `style.opacity`，防止切换时跳变

后续如需进一步消除闪烁，可考虑：
1. 使用 `@gsap/react` 的 `useGSAP` hook 统一管理生命周期和 cleanup
2. 用 `gsap.context()` 包裹每个 SlideView 的动画，unmount 时 `ctx.revert()`
3. 入场动画改用 `gsap.fromTo(ref, fromVars, toVars)` 明确初始/结束状态
4. TransitionController 与 TimelineController 的创建时机错开，避免同一帧内同时写入同一元素
