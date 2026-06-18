import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Courseware } from '@courseware/shared';
import { CoursewareSchema } from '@courseware/shared';
import { Player } from './src/player/Player';
import './src/index.css';

const raw = (window as unknown as { __COURSEWARE__?: Courseware }).__COURSEWARE__;

function renderCourseware(courseware: Courseware) {
  const container = document.getElementById('root');
  if (!container) return;
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Player courseware={courseware} />
    </StrictMode>,
  );
}

if (raw) {
  const result = CoursewareSchema.safeParse(raw);
  if (result.success) {
    renderCourseware(result.data);
  } else {
    document.body.innerHTML = `<div class="p-8 text-red-500">课件数据校验失败：${result.error.message}</div>`;
  }
} else {
  document.body.innerHTML = '<div class="p-8 text-white">未提供课件数据。请通过导出功能生成此 HTML 文件。</div>';
}
