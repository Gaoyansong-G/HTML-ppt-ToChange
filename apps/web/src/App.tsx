import { Link } from 'react-router-dom';
import {
  Play,
  PenLine,
  FileText,
  Layers,
  Wand2,
  Presentation,
  BookOpen,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { AuroraBackground } from './components/ui/AuroraBackground';

export default function App() {
  return (
    <AuroraBackground className="min-h-screen">
      <div className="relative">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                <Presentation size={18} />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">Courseware Agent</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/player"
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white/60 sm:inline-block"
              >
                播放示例
              </Link>
              <Link
                to="/courseware-list"
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white/60 sm:inline-block"
              >
                我的课件
              </Link>
              <Link
                to="/editor"
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white/60 sm:inline-block"
              >
                进入编辑器
              </Link>
              <Link
                to="/wizard"
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
              >
                AI 生成课件
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:pt-24">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
              <BookOpen size={14} className="text-slate-500" />
              AI 驱动的交互式课件生成与编辑系统
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
              让每一堂课都生动可交互
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              上传教学文档，AI 自动提炼大纲、生成内容、设计版式与动画；在可视化工作台中精修，
              一键全屏播放，打造接近专业课件工具的课堂体验。
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/wizard"
                className="group flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-base font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <ArrowRight size={18} />
                开始使用 AI
              </Link>
              <Link
                to="/editor"
                className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                <PenLine size={18} />
                打开工作台
              </Link>
            </div>
          </div>
        </section>

        {/* Bento Feature Grid */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <FileText size={22} className="text-slate-600" />,
                title: '文档一键解析',
                description: '支持 Markdown、TXT、Word 文档上传，自动提取结构与正文，作为 AI 生成依据。',
                className: 'lg:col-span-2',
              },
              {
                icon: <Zap size={22} className="text-slate-600" />,
                title: 'AI 四步生成',
                description: '大纲 → 内容 → 视觉 → 动画，真实 LLM 调用，逐页生成可用课件。',
              },
              {
                icon: <PenLine size={22} className="text-slate-600" />,
                title: '可视化编辑工作台',
                description: '拖拽排版、缩放旋转、属性面板、撤销重做，所见即所得。',
              },
              {
                icon: <Layers size={22} className="text-slate-600" />,
                title: '专业动画与交互',
                description: '丰富的入场动画、测验交互、AI 助手，让课堂更沉浸。',
                className: 'md:col-span-2 lg:col-span-1',
              },
              {
                icon: <Play size={22} className="text-slate-600" />,
                title: '全屏播放预览',
                description: '编辑器与播放器布局一致，随时预览真实课堂效果。',
              },
            ].map((card, index) => (
              <FeatureCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                description={card.description}
                className={card.className}
                delay={index * 80}
              />
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="animate-scale-in rounded-3xl border border-white/60 bg-white/60 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <h2 className="text-center text-2xl font-bold text-slate-900">快速体验</h2>
            <p className="mt-2 text-center text-slate-600">无需准备文档，即可查看示例课件或直接进入创作流程。</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  to: '/player',
                  icon: <Play size={20} />,
                  label: '播放示例课件',
                  desc: '查看《北京的春节》完整效果',
                },
                {
                  to: '/editor',
                  icon: <PenLine size={20} />,
                  label: '编辑示例课件',
                  desc: '在工作台中修改元素与动画',
                },
                {
                  to: '/wizard',
                  icon: <Wand2 size={20} />,
                  label: 'AI 生成新课件',
                  desc: '上传文档，让 AI 自动生成',
                },
              ].map((card, index) => (
                <QuickCard
                  key={card.label}
                  to={card.to}
                  icon={card.icon}
                  label={card.label}
                  desc={card.desc}
                  delay={index * 100}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AuroraBackground>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  className = '',
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`group animate-fade-in-up rounded-3xl border border-white/70 bg-white/70 p-6 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:bg-white/90 hover:shadow-xl ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm transition group-hover:shadow-md">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

function QuickCard({
  to,
  icon,
  label,
  desc,
  delay = 0,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  delay?: number;
}) {
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className="group animate-fade-in-up relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm transition group-hover:scale-105">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-sm text-slate-500">{desc}</div>
      </div>
    </Link>
  );
}
