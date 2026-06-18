import {
  Type,
  Square,
  Circle,
  Triangle,
  Image as ImageIcon,
  ListChecks,
  CheckSquare,
  TextCursorInput,
  Star,
  MessageSquare,
  ArrowRight,
  Minus,
} from 'lucide-react';
import type { Element } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createQuizElement,
} from '../stores/element-factories';

interface ToolbarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  create: () => Element;
}

interface ToolbarGroup {
  label: string;
  labelColor?: string;
  items: ToolbarItem[];
}

export function ElementToolbar() {
  const { courseware, currentSlideId, addElement } = useEditorStore();
  const { record } = useHistoryStore();

  const currentSlide = currentSlideId ? courseware.slides.find((s) => s.id === currentSlideId) : null;

  const handleAdd = (create: () => Element) => {
    if (!currentSlide) return;
    record(courseware);
    const element = create();
    const recentCount = currentSlide.elements.length;
    if (recentCount > 0) {
      element.geometry.x += recentCount * 10;
      element.geometry.y += recentCount * 10;
    }
    addElement(currentSlide.id, element);
  };

  const groups: ToolbarGroup[] = [
    {
      label: '基础',
      labelColor: 'text-slate-500',
      items: [
        {
          id: 'text',
          label: '文本',
          icon: <Type size={16} className="text-slate-600" />,
          create: () => createTextElement('双击编辑文本'),
        },
        {
          id: 'image',
          label: '图片',
          icon: <ImageIcon size={16} className="text-slate-600" />,
          create: () => createImageElement(''),
        },
      ],
    },
    {
      label: '形状',
      labelColor: 'text-slate-500',
      items: [
        { id: 'rect', label: '矩形', icon: <Square size={16} className="text-slate-600" />, create: () => createShapeElement('rectangle') },
        { id: 'circle', label: '圆形', icon: <Circle size={16} className="text-slate-600" />, create: () => createShapeElement('circle') },
        { id: 'triangle', label: '三角形', icon: <Triangle size={16} className="text-slate-600" />, create: () => createShapeElement('triangle') },
        { id: 'arrow', label: '箭头', icon: <ArrowRight size={16} className="text-slate-600" />, create: () => createShapeElement('arrow') },
        { id: 'line', label: '线条', icon: <Minus size={16} className="text-slate-600" />, create: () => createShapeElement('line') },
        { id: 'star', label: '星形', icon: <Star size={16} className="text-slate-600" />, create: () => createShapeElement('star') },
        { id: 'callout', label: '对话框', icon: <MessageSquare size={16} className="text-slate-600" />, create: () => createShapeElement('callout') },
      ],
    },
    {
      label: '交互',
      labelColor: 'text-slate-500',
      items: [
        {
          id: 'quiz-single',
          label: '单选题',
          icon: <ListChecks size={16} className="text-slate-600" />,
          create: () => createQuizElement('single-choice'),
        },
        {
          id: 'quiz-multi',
          label: '多选题',
          icon: <CheckSquare size={16} className="text-slate-600" />,
          create: () => createQuizElement('multiple-choice'),
        },
        {
          id: 'quiz-fill',
          label: '填空题',
          icon: <TextCursorInput size={16} className="text-slate-600" />,
          create: () => createQuizElement('fill-blank'),
        },
      ],
    },
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {groups.map((group) => (
        <div
          key={group.label}
          className="flex items-center gap-0.5 rounded-xl border border-white/60 bg-white/90 p-1 shadow-sm backdrop-blur-sm"
        >
          <span className={`select-none px-2 text-[10px] font-bold uppercase tracking-wider ${group.labelColor}`}>{group.label}</span>
          {group.items.map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleAdd(btn.create)}
              disabled={!currentSlide}
              title={btn.label}
              className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-200 hover:bg-slate-50/80 hover:text-slate-900 hover:shadow-sm disabled:opacity-40"
            >
              {btn.icon}
              <span className="hidden md:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
