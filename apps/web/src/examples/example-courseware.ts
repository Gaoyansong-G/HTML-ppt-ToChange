import type { Courseware } from '@courseware/shared';

export const defaultDesignSystem = {
  id: 'default',
  name: '默认教学风格',
  tokens: {
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',
    },
    fonts: {
      heading: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      body: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontSizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 24,
      '2xl': 32,
      '3xl': 40,
      '4xl': 56,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      full: 9999,
    },
  },
} as const;

export const exampleCourseware: Courseware = {
  id: 'cw-example-001',
  version: '1.0',
  title: '小学六年级语文：北京的春节',
  topicDescription: '通过老舍先生的《北京的春节》，了解老北京春节的习俗与文化。',
  sourceDocument: {
    filename: '北京的春节.docx',
    extractedText: '老舍《北京的春节》原文...',
    structure: [
      {
        id: 'dn-1',
        type: 'heading',
        content: '北京的春节',
        level: 1,
      },
      {
        id: 'dn-2',
        type: 'paragraph',
        content:
          '照北京的老规矩，春节差不多在腊月的初旬就开始了。',
      },
    ],
  },
  designSystem: defaultDesignSystem as any,
  slides: [
    {
      id: 'slide-1',
      order: 0,
      title: '北京的春节',
      learningObjective: '激发学习兴趣，了解课文主题',
      layout: {
        templateId: 'title',
        variant: 'center',
        constraints: [],
      },
      background: {
        color: '#fef3c7',
      },
      elements: [
        {
          id: 'el-title',
          type: 'text',
          semanticRole: 'title',
          name: '标题',
          geometry: {
            x: 240,
            y: 200,
            width: 800,
            height: 100,
            zIndex: 1,
          },
          content: {
            text: '北京的春节',
          },
          style: {
            color: '#78350f',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: -0.02,
            textAlign: 'center',
          },
          animation: {
            entrance: [
              {
                id: 'anim-title-1',
                type: 'scale-in',
                duration: 0.8,
                delay: 0.2,
                easing: 'back.out',
                trigger: 'auto',
              },
            ],
            exit: [
              {
                id: 'anim-title-exit',
                type: 'fade',
                duration: 0.4,
                delay: 0,
                easing: 'power2.in',
                trigger: 'auto',
              },
            ],
          },
          interactions: [],
        },
        {
          id: 'el-subtitle',
          type: 'text',
          semanticRole: 'subtitle',
          name: '副标题',
          geometry: {
            x: 340,
            y: 340,
            width: 600,
            height: 60,
            zIndex: 1,
          },
          content: {
            text: '老舍 · 小学六年级语文',
          },
          style: {
            color: '#92400e',
            fontSize: 28,
            lineHeight: 1.4,
            textAlign: 'center',
          },
          animation: {
            entrance: [
              {
                id: 'anim-subtitle-1',
                type: 'slide-up',
                duration: 0.6,
                delay: 0.6,
                easing: 'power2.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [],
        },
      ],
      transition: {
        type: 'fade',
        duration: 0.8,
        easing: 'power2.inOut',
      },
      timeline: {
        autoPlay: true,
      },
    },
    {
      id: 'slide-2',
      order: 1,
      title: '春节从什么时候开始？',
      learningObjective: '理解课文开头，掌握时间线索',
      layout: {
        templateId: 'content',
        variant: 'left-title',
        constraints: [],
      },
      background: {
        color: '#ffffff',
      },
      elements: [
        {
          id: 'el-heading',
          type: 'text',
          semanticRole: 'title',
          name: '小标题',
          geometry: {
            x: 80,
            y: 60,
            width: 800,
            height: 70,
            zIndex: 1,
          },
          content: {
            text: '春节从什么时候开始？',
          },
          style: {
            color: '#1e293b',
            fontSize: 44,
            fontWeight: 700,
          },
          animation: {
            entrance: [
              {
                id: 'anim-heading-1',
                type: 'slide-right',
                duration: 0.5,
                delay: 0,
                easing: 'power2.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [],
        },
        {
          id: 'el-body',
          type: 'text',
          semanticRole: 'body',
          name: '正文',
          geometry: {
            x: 80,
            y: 160,
            width: 700,
            height: 200,
            zIndex: 1,
          },
          content: {
            text: '照北京的老规矩，春节差不多在腊月的初旬就开始了。\n\n“腊七腊八，冻死寒鸦”，这是一年里最冷的时候。可是，到了严冬，不久便是春天，所以人们并不因为寒冷而减少过年与迎春的热情。',
          },
          style: {
            color: '#334155',
            fontSize: 22,
            lineHeight: 1.8,
          },
          animation: {
            entrance: [
              {
                id: 'anim-body-1',
                type: 'fade',
                duration: 0.6,
                delay: 0.3,
                easing: 'power2.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [],
        },
        {
          id: 'el-answer',
          type: 'text',
          semanticRole: 'answer',
          name: '答案',
          geometry: {
            x: 80,
            y: 400,
            width: 700,
            height: 80,
            zIndex: 1,
          },
          content: {
            text: '✅ 答案：腊月的初旬（腊七腊八前后）',
          },
          style: {
            color: '#166534',
            fontSize: 24,
            backgroundColor: '#dcfce7',
            padding: 16,
            borderRadius: 12,
            opacity: 0,
          },
          animation: {
            entrance: [],
            exit: [],
          },
          interactions: [],
        },
        {
          id: 'el-reveal-btn',
          type: 'shape',
          semanticRole: 'tip',
          name: '显示答案按钮',
          geometry: {
            x: 80,
            y: 520,
            width: 160,
            height: 48,
            zIndex: 2,
          },
          content: {
            shapeType: 'rectangle',
            fill: '#2563eb',
          },
          style: {
            borderRadius: 8,
          },
          animation: {
            entrance: [
              {
                id: 'anim-btn-1',
                type: 'bounce',
                duration: 0.5,
                delay: 0.6,
                easing: 'bounce.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [
            {
              id: 'int-reveal',
              trigger: 'click',
              actions: [
                {
                  id: 'act-show-answer',
                  type: 'show',
                  targetId: 'el-answer',
                },
                {
                  id: 'act-hide-btn',
                  type: 'hide',
                  targetId: 'el-reveal-btn',
                },
              ],
            },
          ],
        },
        {
          id: 'el-btn-text',
          type: 'text',
          semanticRole: 'caption',
          name: '按钮文字',
          geometry: {
            x: 80,
            y: 520,
            width: 160,
            height: 48,
            zIndex: 3,
          },
          content: {
            text: '点击查看答案',
            html: false,
          },
          style: {
            color: '#ffffff',
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 2.8,
          },
          animation: {
            entrance: [],
            exit: [],
          },
          interactions: [
            {
              id: 'int-reveal-text',
              trigger: 'click',
              actions: [
                {
                  id: 'act-show-answer-text',
                  type: 'show',
                  targetId: 'el-answer',
                },
                {
                  id: 'act-hide-btn-text',
                  type: 'hide',
                  targetId: 'el-reveal-btn',
                },
              ],
            },
          ],
        },
      ],
      transition: {
        type: 'slide',
        duration: 0.8,
        easing: 'power2.inOut',
        direction: 'right',
      },
      timeline: {
        autoPlay: true,
      },
      stateMachine: {
        id: 'sm-quiz-1',
        initial: 'hidden',
        states: {
          hidden: {
            on: {
              INT_REVEAL: { target: 'revealed' },
            },
          },
          revealed: {
            entry: [
              { id: 'entry-show', type: 'show', targetId: 'el-answer' },
            ],
          },
        },
      },
    },
    {
      id: 'slide-3',
      order: 2,
      title: '选择题：春节习俗',
      learningObjective: '通过选择题检测对课文内容的理解',
      layout: {
        templateId: 'quiz',
        variant: 'center',
        constraints: [],
      },
      background: {
        color: '#f0f9ff',
      },
      elements: [
        {
          id: 'el-quiz-title',
          type: 'text',
          semanticRole: 'title',
          name: '标题',
          geometry: {
            x: 80,
            y: 40,
            width: 1120,
            height: 60,
            zIndex: 1,
          },
          content: {
            text: '选择题：春节习俗',
          },
          style: {
            color: '#0c4a6e',
            fontSize: 36,
            fontWeight: 700,
            textAlign: 'center',
          },
          animation: {
            entrance: [
              {
                id: 'anim-quiz-title',
                type: 'slide-down',
                duration: 0.5,
                delay: 0,
                easing: 'power2.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [],
        },
        {
          id: 'el-quiz-1',
          type: 'quiz',
          semanticRole: 'question',
          name: '单选题',
          geometry: {
            x: 240,
            y: 140,
            width: 800,
            height: 420,
            zIndex: 2,
          },
          content: {
            type: 'single-choice',
            question: '照北京的老规矩，春节差不多在什么时候就开始了？',
            options: [
              { id: 'opt-a', text: '正月初一', isCorrect: false },
              { id: 'opt-b', text: '腊月的初旬', isCorrect: true, explanation: '课文第一句明确提到。' },
              { id: 'opt-c', text: '正月十五', isCorrect: false },
              { id: 'opt-d', text: '腊月二十三', isCorrect: false },
            ],
            explanation: '正确答案是 B。老舍在文中写道："照北京的老规矩，春节差不多在腊月的初旬就开始了。"',
            allowRetry: true,
          },
          style: {
            color: '#1e293b',
            fontSize: 18,
          },
          animation: {
            entrance: [
              {
                id: 'anim-quiz-1',
                type: 'fade',
                duration: 0.6,
                delay: 0.3,
                easing: 'power2.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [],
        },
      ],
      transition: {
        type: 'slide',
        duration: 0.8,
        easing: 'power2.inOut',
        direction: 'right',
      },
      timeline: {
        autoPlay: true,
      },
      aiAssistant: {
        enabled: true,
        contextScope: 'slide',
        welcomeMessage: '我是本页 AI 助手，可以帮你理解这道选择题。',
        suggestedQuestions: ['这道题考查什么知识点？', '为什么选 B？'],
      },
    },
    {
      id: 'slide-4',
      order: 3,
      title: '填空题：最冷的时候',
      learningObjective: '通过填空题巩固对课文细节的记忆',
      layout: {
        templateId: 'quiz',
        variant: 'center',
        constraints: [],
      },
      background: {
        color: '#f5f3ff',
      },
      elements: [
        {
          id: 'el-fill-title',
          type: 'text',
          semanticRole: 'title',
          name: '标题',
          geometry: {
            x: 80,
            y: 40,
            width: 1120,
            height: 60,
            zIndex: 1,
          },
          content: {
            text: '填空题：最冷的时候',
          },
          style: {
            color: '#4c1d95',
            fontSize: 36,
            fontWeight: 700,
            textAlign: 'center',
          },
          animation: {
            entrance: [
              {
                id: 'anim-fill-title',
                type: 'slide-down',
                duration: 0.5,
                delay: 0,
                easing: 'power2.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [],
        },
        {
          id: 'el-fill-1',
          type: 'quiz',
          semanticRole: 'question',
          name: '填空题',
          geometry: {
            x: 240,
            y: 160,
            width: 800,
            height: 320,
            zIndex: 2,
          },
          content: {
            type: 'fill-blank',
            question: '“腊七腊八，冻死______”，这是一年里最冷的时候。',
            correctAnswer: '寒鸦',
            explanation: '原文为：“腊七腊八，冻死寒鸦”。',
            hint: '一种黑色的鸟。',
            allowRetry: true,
            placeholder: '请输入答案',
          },
          style: {
            color: '#1e293b',
            fontSize: 20,
          },
          animation: {
            entrance: [
              {
                id: 'anim-fill-1',
                type: 'fade',
                duration: 0.6,
                delay: 0.3,
                easing: 'power2.out',
                trigger: 'auto',
              },
            ],
            exit: [],
          },
          interactions: [],
        },
      ],
      transition: {
        type: 'slide',
        duration: 0.8,
        easing: 'power2.inOut',
        direction: 'right',
      },
      timeline: {
        autoPlay: true,
      },
    },
    {
      id: 'slide-5',
      order: 4,
      title: '公式与图表示例',
      learningObjective: '验证 formula(KaTeX) 与 diagram(Mermaid) 元素渲染',
      layout: {
        templateId: 'content',
        variant: 'left-title',
        constraints: [],
      },
      background: {
        color: '#ffffff',
      },
      elements: [
        {
          id: 'el-math-title',
          type: 'text',
          semanticRole: 'title',
          name: '标题',
          geometry: {
            x: 80,
            y: 40,
            width: 1120,
            height: 60,
            zIndex: 1,
          },
          content: {
            text: '一元二次方程求根公式',
          },
          style: {
            color: '#1e293b',
            fontSize: 36,
            fontWeight: 700,
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
        {
          id: 'el-formula-1',
          type: 'formula',
          semanticRole: 'example',
          name: '求根公式',
          geometry: {
            x: 80,
            y: 140,
            width: 560,
            height: 160,
            zIndex: 2,
          },
          content: {
            latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
            displayMode: true,
          },
          style: {
            color: '#1e3a8a',
            backgroundColor: '#eff6ff',
            borderRadius: 16,
            padding: 16,
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
        {
          id: 'el-formula-2',
          type: 'formula',
          semanticRole: 'body',
          name: '判别式',
          geometry: {
            x: 80,
            y: 330,
            width: 560,
            height: 70,
            zIndex: 2,
          },
          content: {
            latex: '\\Delta = b^2 - 4ac',
            displayMode: false,
          },
          style: {
            color: '#0f766e',
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
        {
          id: 'el-formula-err',
          type: 'formula',
          semanticRole: 'caption',
          name: '错误公式兜底',
          geometry: {
            x: 80,
            y: 420,
            width: 560,
            height: 50,
            zIndex: 2,
          },
          content: {
            latex: '\\frac{1}{\\notacommand{',
            displayMode: false,
          },
          style: {},
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
        {
          id: 'el-diagram-1',
          type: 'diagram',
          semanticRole: 'example',
          name: '解题流程图',
          geometry: {
            x: 700,
            y: 140,
            width: 500,
            height: 420,
            zIndex: 2,
          },
          content: {
            type: 'mermaid',
            definition:
              'flowchart TD\n    A[写出一般形式 ax²+bx+c=0] --> B[计算判别式 Δ=b²-4ac]\n    B --> C{Δ 的符号}\n    C -->|Δ>0| D[两个不等实根]\n    C -->|Δ=0| E[两个相等实根]\n    C -->|Δ<0| F[无实根]',
          },
          style: {
            backgroundColor: '#f8fafc',
            borderRadius: 16,
            padding: 8,
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
      ],
      transition: {
        type: 'slide',
        duration: 0.8,
        easing: 'power2.inOut',
        direction: 'right',
      },
      timeline: {
        autoPlay: true,
      },
    },
    {
      id: 'slide-6',
      order: 5,
      title: '音频与视频示例',
      learningObjective: '验证 audio / video 元素渲染（资源缺失时的占位兜底）',
      layout: {
        templateId: 'content',
        variant: 'left-title',
        constraints: [],
      },
      background: {
        color: '#f8fafc',
      },
      elements: [
        {
          id: 'el-media-title',
          type: 'text',
          semanticRole: 'title',
          name: '标题',
          geometry: {
            x: 80,
            y: 40,
            width: 1120,
            height: 60,
            zIndex: 1,
          },
          content: {
            text: '课文朗读与春节习俗视频',
          },
          style: {
            color: '#1e293b',
            fontSize: 36,
            fontWeight: 700,
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
        {
          id: 'el-audio-1',
          type: 'audio',
          semanticRole: 'body',
          name: '课文朗读音频',
          geometry: {
            x: 80,
            y: 160,
            width: 560,
            height: 90,
            zIndex: 2,
          },
          content: {
            assetId: 'asset-audio-demo',
            autoPlay: false,
            loop: false,
          },
          style: {},
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
        {
          id: 'el-video-1',
          type: 'video',
          semanticRole: 'example',
          name: '春节习俗视频',
          geometry: {
            x: 80,
            y: 290,
            width: 640,
            height: 360,
            zIndex: 2,
          },
          content: {
            assetId: 'asset-video-demo',
            autoPlay: false,
            loop: false,
            controls: true,
          },
          style: {
            borderRadius: 16,
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
        {
          id: 'el-media-note',
          type: 'text',
          semanticRole: 'caption',
          name: '说明',
          geometry: {
            x: 760,
            y: 290,
            width: 440,
            height: 120,
            zIndex: 2,
          },
          content: {
            text: '上方音频卡片已关联示例音频（可点击播放）；视频元素引用的资源未包含在示例课件中，因此显示占位卡片。',
          },
          style: {
            color: '#64748b',
            fontSize: 16,
            lineHeight: 1.8,
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
      ],
      transition: {
        type: 'slide',
        duration: 0.8,
        easing: 'power2.inOut',
        direction: 'right',
      },
      timeline: {
        autoPlay: true,
      },
    },
  ],
  assets: [
    {
      id: 'asset-audio-demo',
      type: 'audio',
      filename: '示例提示音.wav',
      mimeType: 'audio/wav',
      url: 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAGAACAjpmip6ijmo+BdGdeWVhcZXB9i5ihp6iknJGEdmpgWlhbY257iZWgpqilnpOGeWxhWlhaYWx5hpOepaimoJWJe25jW1haYGp2hJGcpKinoZiLfXBlXFhZXmd0gY+ao6inopmOgHJnXllYXWZxf4yZoqeopJuQg3VoX1lYXGRvfIqWoKaopZ2ShXdrYFpYW2JteoeUn6aopp+Uh3ptYltYWmBrd4WSnaWopqCWinxvZFxYWV9odYOQm6Sop6KZjH9xZl1YWV5ncoCOmaKnqKOaj4F0Z15ZWFxlcH2LmKGnqKSckYR2amBaWFtjbnuJlaCmqKWek4Z5bGFaWFphbHmGk56lqKaglYl7bmNbWFpganaEkZykqKehmIt9cGVcWFleZ3SBj5qjqKeimY6AcmdeWVhdZnF/jJmip6ikm5CDdWhfWVhcZG98ipagpqilnZKFd2tgWlhbYm16h5Sfpqimn5SHem1iW1haYGt3hZKdpaimoJaKfG9kXFhZX2h1g5CbpKinopmMf3FmXVhZXmdygI6Zoqeoo5qPgXRnXllYXGVwfYuYoaeopJyRhHZqYFpYW2Nue4mVoKaopZ6ThnlsYVpYWmFseYaTnqWopqCViXtuY1tYWmBqdoSRnKSop6GYi31wZVxYWV5ndIGPmqOop6KZjoByZ15ZWF1mcX+MmaKnqKSbkIN1aF9ZWFxkb3yKlqCmqKWdkoV3a2BaWFtibXqHlJ+mqKaflId6bWJbWFpga3eFkp2lqKaglop8b2RcWFlfaHWDkJukqKeimYx/cWZdWFleZ3KAjpmip6ijmo+BdGdeWVhcZXB9i5ihp6iknJGEdmpgWlhbY257iZWgpqilnpOGeWxhWlhaYWx5hpOepaimoJWJe25jW1haYGp2hJGcpKinoZiLfXBlXFhZXmd0gY+ao6inopmOgHJnXllYXWZxf4yZoqeopJuQg3VoX1lYXGRvfIqWoKaopZ2ShXdrYFpYW2JteoeUn6aopp+Uh3ptYltYWmBrd4WSnaWopqCWinxvZFxYWV9odYOQm6Sop6KZjH9xZl1YWV5ncoCOmaKnqKOaj4F0Z15ZWFxlcH2LmKGnqKSckYR2amBaWFtjbnuJlaCmqKWek4Z5bGFaWFphbHmGk56lqKaglYl7bmNbWFpganaEkZykqKehmIt9cGVcWFleZ3SBj5qjqKeimY6AcmdeWVhdZnF/jJmip6ikm5CDdWhfWVhcZG98ipagpqilnZKFd2tgWlhbYm16h5Sfpqimn5SHem1iW1haYGt3hZKdpaimoJaKfG9kXFhZX2h1g5CbpKinopmMf3FmXVhZXmdygI6Zoqeoo5qPgXRnXllYXGVwfYuYoaeopJyRhHZqYFpYW2Nue4mVoKaopZ6ThnlsYVpYWmFseYaTnqWopqCViXtuY1tYWmBqdoSRnKSop6GYi31wZVxYWV5ndIGPmqOop6KZjoByZ15ZWF1mcX+MmaKnqKSbkIN1aF9ZWFxkb3yKlqCmqKWdkoV3a2BaWFtibXqHlJ+mqKaflId6bWJbWFpga3eFkp2lqKaglop8b2RcWFlfaHWDkJukqKeimYx/cWZdWFleZ3KAjpmip6ijmo+BdGdeWVhcZXB9i5ihp6iknJGEdmpgWlhbY257iZWgpqilnpOGeWxhWlhaYWx5hpOepaimoJWJe25jW1haYGp2hJGcpKinoZiLfXBlXFhZXmd0gY+ao6inopmOgHJnXllYXWZxf4yZoqeopJuQg3VoX1lYXGRvfIqWoKaopZ2ShXdrYFpYW2JteoeUn6aopp+Uh3ptYltYWmBrd4WSnaWopqCWinxvZFxYWV9odYOQm6Sop6KZjH9xZl1YWV5ncoCOmaKnqKOaj4F0Z15ZWFxlcH2LmKGnqKSckYR2amBaWFtjbnuJlaCmqKWek4Z5bGFaWFphbHmGk56lqKaglYl7bmNbWFpganaEkZykqKehmIt9cGVcWFleZ3SBj5qjqKehmIt9cGVcWFleZ3SBj5qjqKeimY6AcmdeWVhdZnF/jJmip6ikm5CDdWhfWVhcZG98ipagpqilnZKFd2tgWlhbYm16h5Sfpqimn5SHem1iW1haYGt3hZKdpaimoJaKfG9kXFhZX2h1g5CbpKinopmMf3FmXVhZXmdygI6Zoqeoo5qPgXRnXllYXGVwfYuYoaeopJyRhHZqYFpYW2Nue4mVoKaopZ6ThnlsYVpYWmFseYaTnqWopqCViXtuY1tYWmBqdoSRnKSop6GYi31wZVxYWV5ndIGPmqOop6KZjoByZ15ZWF1mcX+MmaKnqKSbkIN1aF9ZWFxkb3yKlqCmqKWdkoV3a2BaWFtibXqHlJ+mqKaflId6bWJbWFpga3eFkp2lqKaglop8b2RcWFlfaHWDkJukqKeimYx/cWZdWFleZ3KAjpmip6ijmo+BdGdeWVhcZXB9i5ihp6iknJGEdmpgWlhbY257iZWgpqilnpOGeWxhWlhaYWx5hpOepaimoJWJe25jW1haYGp2hJGcpKinoZiLfXBlXFhZXmd0gY+ao6inopmOgHJnXllYXWZxf4yZoqeopJuQg3VoX1lYXGRvfIqWoKaopZ2ShXdrYFpYW2JteoeUn6aopp+Uh3ptYltYWmBrd4WSnaWopqCWinxvZFxYWV9odYOQm6Sop6KZjH9xZl1YWV5ncoCOmaKnqKOaj4F0Z15ZWFxlcH2LmKGnqKSckYR2amBaWFtjbnuJlaCmqKWek4Z5bGFaWFphbHmGk56lqKaglYl7bmNbWFpganaEkZykqKehmIt9cGVcWFleZ3SBj5qjqKehmIt9cGVcWFleZ3SBj5qjqKeimY6AcmdeWVhdZnF/jJmip6ikm5CDdWhfWVhcZG98ipagpqilnZKFd2tgWlhbYm16h5Sfpqimn5SHem1iW1haYGt3hZKdpaimoJaKfG9kXFhZX2h1g5CbpKinopmMf3FmXVhZXmdy',
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
