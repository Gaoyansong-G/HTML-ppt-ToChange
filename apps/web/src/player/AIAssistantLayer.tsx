import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import type { Courseware, Slide } from '@courseware/shared';
import { API_BASE } from '../lib/api';



interface AIAssistantLayerProps {
  courseware: Courseware;
  slide: Slide;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** 字符二元组集合（中英文混排的轻量相似度） */
function bigrams(text: string): Set<string> {
  const t = text.replace(/\s+/g, '');
  const set = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}

/** 预置问答本地匹配（离线兜底）：Jaccard 相似度 ≥ 0.25 视为命中 */
function matchPresetQA(question: string, presetQA?: { question: string; answer: string }[]): string | null {
  if (!presetQA || !presetQA.length) return null;
  const q = bigrams(question);
  let best: { score: number; answer: string } | null = null;
  for (const item of presetQA) {
    const p = bigrams(item.question);
    let inter = 0;
    q.forEach((g) => { if (p.has(g)) inter++; });
    const score = inter / (q.size + p.size - inter || 1);
    if (!best || score > best.score) best = { score, answer: item.answer };
  }
  return best && best.score >= 0.25 ? best.answer : null;
}

export function AIAssistantLayer({ courseware, slide }: AIAssistantLayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const welcomeMessage = slide.aiAssistant?.welcomeMessage || '你好！我是你的 AI 学习助手，有任何问题都可以问我。';

  useEffect(() => {
    setMessages([{ role: 'assistant', content: welcomeMessage }]);
    setInput('');
    setLoading(false);
  }, [slide.id, welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (text?: string) => {
    const userMessage = (text ?? input).trim();
    if (!userMessage || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursewareId: courseware.id,
          slideId: slide.id,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      let assistantContent: string;
      if (response.ok) {
        const data = await response.json();
        assistantContent = data.message?.content || '抱歉，我暂时无法回答这个问题。';
      } else {
        assistantContent = `当前 AI 问答接口返回了 ${response.status}，请检查后端服务或 API 配置。`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch {
      // 离线兜底：优先匹配课件内嵌的预置问答
      const presetAnswer = matchPresetQA(userMessage, courseware.presetQA);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: presetAnswer
            ? `${presetAnswer}\n\n（离线模式 · 来自本课预置问答）`
            : '当前无法连接到 AI 服务（可能处于离线环境）。你可以试试问这些：\n' +
              (courseware.presetQA || []).slice(0, 3).map((q) => `· ${q.question}`).join('\n'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = slide.aiAssistant?.suggestedQuestions ||
    (courseware.presetQA || []).slice(0, 3).map((q) => q.question).filter(Boolean).length
      ? (slide.aiAssistant?.suggestedQuestions || (courseware.presetQA || []).slice(0, 3).map((q) => q.question))
      : ['这一页讲了什么？', '重点是什么？', '能给我举个例子吗？'];

  return (
    <div className="absolute bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <MessageCircle size={14} />
          </div>
          <span className="font-medium">AI 助手</span>
        </button>
      ) : (
        <div className="flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-900/20 backdrop-blur-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <MessageCircle size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold">AI 学习助手</div>
                <div className="text-[10px] text-slate-300">基于当前页面内容回答</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-3 flex animate-fade-in ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                    <MessageCircle size={12} />
                  </div>
                )}
                <div
                  data-testid={message.role === 'assistant' ? 'assistant-message' : undefined}
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-100 bg-white text-slate-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                  <MessageCircle size={12} />
                </div>
                <div className="flex items-center gap-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-slate-100 bg-white p-3">
            {messages.length <= 1 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(question)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div className="group relative rounded-2xl bg-slate-300 p-[1px] shadow-sm transition-shadow focus-within:shadow-md focus-within:shadow-slate-500/20">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-1.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="输入问题..."
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white transition hover:bg-slate-600 disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
