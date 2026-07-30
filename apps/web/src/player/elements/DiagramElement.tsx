import { useEffect, useId, useState } from 'react';
import type { Element } from '@courseware/shared';
import { Loader2 } from 'lucide-react';

interface DiagramElementProps {
  element: Element;
}

interface DiagramContent {
  type?: 'mermaid' | 'excalidraw' | 'custom';
  definition?: string;
}

type RenderState =
  | { status: 'loading' }
  | { status: 'done'; svg: string }
  | { status: 'error'; message: string };

/** 让 mermaid 输出的 SVG 填满元素容器（保留 viewBox 等比缩放） */
function fitSvg(svg: string): string {
  let out = svg;
  if (/style="max-width:[^"]*"/.test(out)) {
    out = out.replace(/style="max-width:[^"]*"/, 'style="width:100%;height:100%;"');
  } else {
    out = out.replace('<svg', '<svg style="width:100%;height:100%;"');
  }
  return out;
}

/** mermaid.render 会在 body 上挂临时节点，失败时可能残留，尽力清理 */
function cleanupMermaidDom(renderId: string) {
  try {
    document.getElementById(renderId)?.remove();
    document.getElementById(`d${renderId}`)?.remove();
  } catch {
    // ignore
  }
}

export function DiagramElement({ element }: DiagramElementProps) {
  const content = element.content as DiagramContent;
  const { geometry, style } = element;
  const definition = content.definition ?? '';
  const diagramType = content.type ?? 'mermaid';
  const reactId = useId();
  // useId 含冒号，且 mermaid 要求全局唯一 id -> 清洗为纯字母数字
  const uid = `mmd-${reactId.replace(/[^a-zA-Z0-9]/g, '')}-${element.id.replace(/[^a-zA-Z0-9]/g, '')}`;

  const [state, setState] = useState<RenderState>({ status: 'loading' });

  useEffect(() => {
    if (diagramType !== 'mermaid') {
      setState({ status: 'error', message: `暂不支持的图表类型：${diagramType}` });
      return;
    }
    if (!definition.trim()) {
      setState({ status: 'error', message: '图表定义为空' });
      return;
    }

    let cancelled = false;
    const renderId = `${uid}-${Date.now().toString(36)}`;

    (async () => {
      try {
        // mermaid 体积较大，按需动态加载
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
        const { svg } = await mermaid.render(renderId, definition);
        if (!cancelled) {
          setState({ status: 'done', svg: fitSvg(svg) });
        }
      } catch (err) {
        cleanupMermaidDom(renderId);
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : '图表渲染失败',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanupMermaidDom(renderId);
    };
  }, [definition, diagramType, uid]);

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    height: geometry.height,
    zIndex: geometry.zIndex,
    transform: geometry.rotation ? `rotate(${geometry.rotation}deg)` : undefined,
    backgroundColor: style.backgroundColor,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
    borderColor: style.borderColor,
    borderStyle: style.borderStyle,
    padding: style.padding ? `${style.padding}px` : undefined,
    opacity: style.opacity ?? 1,
    boxShadow: style.shadow,
    overflow: 'hidden',
  };

  return (
    <div id={element.id} style={wrapperStyle}>
      {state.status === 'loading' && (
        <div className="flex h-full w-full items-center justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}
      {state.status === 'done' && (
        <div
          className="flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full"
          // mermaid 本地渲染生成的可信 SVG
          dangerouslySetInnerHTML={{ __html: state.svg }}
        />
      )}
      {state.status === 'error' && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center">
          <span className="text-xs font-medium text-slate-500">图表渲染失败</span>
          <span className="line-clamp-2 text-[10px] text-red-400">{state.message}</span>
          <pre className="max-h-1/2 w-full overflow-hidden whitespace-pre-wrap break-all text-left text-[10px] leading-tight text-slate-400">
            {definition}
          </pre>
        </div>
      )}
    </div>
  );
}
