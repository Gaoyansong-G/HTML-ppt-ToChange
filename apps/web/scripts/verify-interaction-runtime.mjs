import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

class FakeHTMLElement {
  constructor() {
    this.dataset = {};
    this.style = {};
    this.textContent = '';
    this.tabIndex = -1;
    this.attributes = new Map();
    this.listeners = new Map();
  }

  addEventListener(name, handler) {
    const handlers = this.listeners.get(name) ?? [];
    handlers.push(handler);
    this.listeners.set(name, handlers);
  }

  removeEventListener(name, handler) {
    const handlers = this.listeners.get(name) ?? [];
    this.listeners.set(
      name,
      handlers.filter((candidate) => candidate !== handler),
    );
  }

  dispatch(name, event = { target: this }) {
    (this.listeners.get(name) ?? []).forEach((handler) => handler(event));
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector() {
    return null;
  }
}

class FakeHTMLMediaElement extends FakeHTMLElement {}

class FakeCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
const nativeClearTimeout = globalThis.clearTimeout.bind(globalThis);
const dispatchedEvents = [];

Object.defineProperty(globalThis, 'HTMLElement', {
  configurable: true,
  value: FakeHTMLElement,
});
Object.defineProperty(globalThis, 'HTMLMediaElement', {
  configurable: true,
  value: FakeHTMLMediaElement,
});
Object.defineProperty(globalThis, 'CustomEvent', {
  configurable: true,
  value: FakeCustomEvent,
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    setTimeout: nativeSetTimeout,
    clearTimeout: nativeClearTimeout,
    location: { href: 'http://localhost/player' },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      return true;
    },
    open() {
      return null;
    },
  },
});

const wait = (milliseconds) =>
  new Promise((resolve) => nativeSetTimeout(resolve, milliseconds));

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({
  root,
  appType: 'custom',
  resolve: {
    alias: {
      '@courseware/shared': fileURLToPath(
        new URL('../../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: { middlewareMode: true },
  logLevel: 'silent',
});

try {
  const { InteractionController } = await vite.ssrLoadModule(
    '/src/player/InteractionController.ts',
  );
  const { InteractiveRenderer } = await vite.ssrLoadModule(
    '/src/player/interactives/index.tsx',
  );
  const { GroupElement } = await vite.ssrLoadModule(
    '/src/player/elements/GroupElement.tsx',
  );
  const { InteractionBehaviorEditor } = await vite.ssrLoadModule(
    '/src/editor/property/InteractionBehaviorEditor.tsx',
  );
  const { ThemeProvider } = await vite.ssrLoadModule('/src/lib/theme-context.tsx');

  const target = new FakeHTMLElement();
  const elementRefs = new Map([['interactive-1', target]]);
  const stateChanges = [];
  const controller = new InteractionController({
    elementRefs,
    onStateChange: (machineId, state) => stateChanges.push([machineId, state]),
  });

  const automaticRule = {
    id: 'automatic-rule',
    trigger: 'auto',
    delayMs: 5,
    actions: [
      {
        id: 'automatic-action',
        type: 'record-annotation',
        payload: { marker: 'automatic' },
      },
    ],
  };

  controller.registerInteractions('interactive-1', [automaticRule]);
  await wait(20);
  assert.equal(
    dispatchedEvents.length,
    0,
    'inactive slides must not start automatic interactions',
  );

  controller.setActive(true);
  await wait(20);
  assert.equal(dispatchedEvents.length, 1);
  assert.equal(dispatchedEvents[0].detail.marker, 'automatic');

  controller.setActive(false);
  controller.setActive(true);
  await wait(20);
  assert.equal(
    dispatchedEvents.length,
    1,
    'automatic interactions must not register or fire twice',
  );
  controller.destroy();

  dispatchedEvents.length = 0;
  const semanticController = new InteractionController({
    elementRefs,
    onStateChange: (machineId, state) => stateChanges.push([machineId, state]),
  });
  const stateMachine = {
    id: 'lesson-machine',
    initial: 'waiting',
    states: {
      waiting: {
        entry: [
          {
            id: 'entry-action',
            type: 'record-annotation',
            payload: { marker: 'entry' },
          },
        ],
        on: {
          COMPLETE_RULE: {
            target: 'finished',
            actions: [
              {
                id: 'transition-action',
                type: 'record-annotation',
                payload: { marker: 'transition' },
              },
            ],
          },
        },
      },
      finished: {},
    },
  };
  const completeRule = {
    id: 'complete-rule',
    trigger: 'interactive-complete',
    actions: [
      {
        id: 'complete-action',
        type: 'record-annotation',
        payload: { marker: 'complete' },
      },
    ],
  };

  semanticController.registerInteractions(
    'interactive-1',
    [completeRule],
    stateMachine,
  );
  semanticController.registerStateMachine(stateMachine);
  semanticController.trigger('interactive-1', 'COMPLETE');
  assert.equal(
    dispatchedEvents.length,
    0,
    'semantic events from an inactive pre-mounted slide must be ignored',
  );

  semanticController.setActive(true);
  semanticController.trigger('interactive-1', 'COMPLETE');
  assert.deepEqual(
    dispatchedEvents.map((event) => event.detail.marker),
    ['entry', 'complete', 'transition'],
  );
  assert.deepEqual(stateChanges.at(-1), ['lesson-machine', 'finished']);
  semanticController.destroy();

  const interactiveConfigs = {
    matching: {
      pairs: [
        { id: 'pair-1', left: '甲', right: 'A' },
        { id: 'pair-2', left: '乙', right: 'B' },
      ],
    },
    categorize: {
      categories: [{ id: 'category-1', name: '类别' }],
      items: [{ id: 'item-1', text: '项目', categoryId: 'category-1' }],
    },
    ordering: {
      items: [
        { id: 'order-1', text: '第一步' },
        { id: 'order-2', text: '第二步' },
      ],
      correctOrder: ['order-1', 'order-2'],
    },
    timer: { seconds: 60, label: '课堂计时' },
    scoreboard: {
      teams: [
        { id: 'team-1', name: '第一组' },
        { id: 'team-2', name: '第二组' },
      ],
    },
    picker: { names: ['小明', '小红'] },
    'card-flip': {
      cards: [{ id: 'card-1', front: '问题', back: '答案' }],
    },
  };

  const makeInteractive = (id, interactiveType, config, geometry = {}) => ({
    id,
    type: 'interactive',
    geometry: {
      x: 0,
      y: 0,
      width: 480,
      height: 320,
      zIndex: 1,
      ...geometry,
    },
    content: { interactiveType, config },
    style: {},
    animation: { entrance: [], exit: [] },
    interactions: [],
  });

  for (const [interactiveType, config] of Object.entries(interactiveConfigs)) {
    const id = `runtime-${interactiveType}`;
    const markup = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(InteractiveRenderer, {
          element: makeInteractive(id, interactiveType, config),
          mode: 'player',
        }),
      ),
    );
    assert.match(markup, new RegExp(`id="${id}"`));
    assert.doesNotMatch(markup, /暂不支持的互动类型/);
    if (interactiveType === 'categorize') {
      assert.match(markup, /aria-label="选择卡片：项目"/);
      assert.match(markup, /aria-pressed="false"/);
      assert.match(markup, /aria-label="分类篮：类别，已放入 0 项"/);
    }
    if (interactiveType === 'scoreboard') {
      assert.match(markup, /结束计分/);
    }
  }

  const groupedScoreboard = makeInteractive(
    'grouped-scoreboard',
    'scoreboard',
    interactiveConfigs.scoreboard,
    { x: 20, y: 20 },
  );
  const group = {
    id: 'runtime-group',
    type: 'group',
    geometry: { x: 0, y: 0, width: 640, height: 480, zIndex: 1 },
    content: { children: [groupedScoreboard] },
    style: {},
    animation: { entrance: [], exit: [] },
    interactions: [],
  };
  const groupMarkup = renderToStaticMarkup(
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(GroupElement, {
        element: group,
        assets: [],
      }),
    ),
  );
  assert.match(groupMarkup, /id="runtime-group"/);
  assert.match(groupMarkup, /id="grouped-scoreboard"/);
  assert.match(groupMarkup, /结束计分/);

  const nestedTarget = {
    id: 'nested-target',
    type: 'text',
    geometry: { x: 20, y: 20, width: 200, height: 60, zIndex: 1 },
    content: { text: '组合内目标' },
    style: {},
    animation: { entrance: [], exit: [] },
    interactions: [],
  };
  const sourceElement = {
    id: 'source-element',
    type: 'text',
    geometry: { x: 0, y: 0, width: 200, height: 60, zIndex: 1 },
    content: { text: '触发元素' },
    style: {},
    animation: { entrance: [], exit: [] },
    interactions: [
      {
        id: 'nested-target-rule',
        trigger: 'click',
        actions: [
          {
            id: 'nested-target-action',
            type: 'show',
            targetId: 'nested-target',
          },
        ],
      },
    ],
  };
  const targetGroup = {
    id: 'target-group',
    type: 'group',
    geometry: { x: 0, y: 80, width: 300, height: 180, zIndex: 1 },
    content: { children: [nestedTarget] },
    style: {},
    animation: { entrance: [], exit: [] },
    interactions: [],
  };
  const editorMarkup = renderToStaticMarkup(
    React.createElement(InteractionBehaviorEditor, {
      element: sourceElement,
      slideElements: [sourceElement, targetGroup],
      slides: [{ id: 'runtime-slide', title: '回归页面' }],
      onChange() {},
      onSetInitiallyHidden() {},
    }),
  );
  assert.match(editorMarkup, /value="nested-target"/);
  assert.match(editorMarkup, /组合内目标/);
  assert.doesNotMatch(editorMarkup, /原目标元素已不存在/);
  assert.match(editorMarkup, /每条行为至少需要一个动作/);

  process.stdout.write('interaction runtime checks passed\n');
} finally {
  await vite.close();
}
