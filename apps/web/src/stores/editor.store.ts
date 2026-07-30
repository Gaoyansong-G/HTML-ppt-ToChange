import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Courseware, Element, Slide } from '@courseware/shared';
import { DEFAULT_DESIGN_SYSTEM } from '@courseware/shared';
import { exampleCourseware } from '../examples/example-courseware';
import {
  clampElementZIndex,
  cloneElement,
  cloneElementSet,
  normalizeElementZIndices,
  remapElementTargetIds,
} from './element-factories';

export interface EditorState {
  courseware: Courseware;
  currentSlideId: string | null;
  selectedElementId: string | null;
  selectedElementIds: string[];
  editingElementId: string | null;
  isPlaying: boolean;
  canvasZoom: number;
}

export interface EditorActions {
  // Courseware operations
  setCourseware: (courseware: Courseware) => void;

  // Slide operations
  setCurrentSlide: (slideId: string) => void;
  addSlide: (afterIndex?: number) => void;
  addSlideWithElements: (slide: Slide) => void;
  duplicateSlide: (slideId: string) => void;
  deleteSlide: (slideId: string) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  updateSlide: (slideId: string, updater: (slide: Slide) => void) => void;

  // Element operations
  selectElement: (elementId: string | null) => void;
  toggleElementSelection: (elementId: string) => void;
  clearElementSelection: () => void;
  setEditingElement: (elementId: string | null) => void;
  addElement: (slideId: string, element: Element) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  deleteSelectedElements: (slideId: string) => void;
  updateElement: (slideId: string, elementId: string, updater: (element: Element) => void) => void;
  batchUpdateElement: (slideId: string, elementId: string, updates: Partial<Element>) => void;
  duplicateElement: (slideId: string, elementId: string) => void;
  duplicateSelectedElements: (slideId: string) => void;
  distributeElements: (slideId: string, axis: 'horizontal' | 'vertical') => void;
  groupSelectedElements: (slideId: string) => void;
  ungroupSelectedElement: (slideId: string, groupId: string) => void;
  resizeGroup: (slideId: string, groupId: string, newGeometry: Element['geometry']) => void;
  bringToFront: (slideId: string, elementId: string) => void;
  sendToBack: (slideId: string, elementId: string) => void;
  nudgeElement: (slideId: string, elementId: string, dx: number, dy: number) => void;
  nudgeSelectedElements: (slideId: string, dx: number, dy: number) => void;

  // UI
  setIsPlaying: (isPlaying: boolean) => void;
  setCanvasZoom: (zoom: number) => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function cloneAndNormalizeCourseware(courseware: Courseware): Courseware {
  const normalized = JSON.parse(JSON.stringify(courseware)) as Courseware;
  normalized.slides.forEach((slide) => normalizeElementZIndices(slide.elements));
  return normalized;
}

function moveElementToStackEdge(
  elements: Element[],
  elementId: string,
  edge: 'front' | 'back',
) {
  const ordered = elements
    .map((element, index) => ({ element, index }))
    .sort(
      (a, b) =>
        clampElementZIndex(a.element.geometry.zIndex) -
          clampElementZIndex(b.element.geometry.zIndex) ||
        a.index - b.index,
    );
  const targetIndex = ordered.findIndex(({ element }) => element.id === elementId);
  if (targetIndex < 0) return;

  const [target] = ordered.splice(targetIndex, 1);
  if (edge === 'front') {
    ordered.push(target);
  } else {
    ordered.unshift(target);
  }

  ordered.forEach(({ element }, index) => {
    element.geometry.zIndex = clampElementZIndex(index + 1);
  });
}

const initialCourseware = cloneAndNormalizeCourseware(exampleCourseware);

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set) => ({
    courseware: initialCourseware,
    currentSlideId: initialCourseware.slides[0]?.id || null,
    selectedElementId: null,
    selectedElementIds: [],
    editingElementId: null,
    isPlaying: false,
    canvasZoom: 1,

    setCourseware: (courseware) => {
      set((state) => {
        const normalizedCourseware = cloneAndNormalizeCourseware(courseware);
        state.courseware = normalizedCourseware;
        if (!state.currentSlideId || !normalizedCourseware.slides.find((s) => s.id === state.currentSlideId)) {
          state.currentSlideId = normalizedCourseware.slides[0]?.id || null;
        }
      });
    },

    setCanvasZoom: (zoom) => {
      set((state) => {
        // canvasZoom is relative to the fitted scale. Compact workspaces can
        // need more than 3× to reach a true 1:1 (1280×720) stage.
        const nextZoom = Math.max(0.25, Math.min(16, zoom));
        if (Math.abs(state.canvasZoom - nextZoom) < 0.0001) return;
        state.canvasZoom = nextZoom;
      });
    },

    setCurrentSlide: (slideId) => {
      set((state) => {
        state.currentSlideId = slideId;
        state.selectedElementId = null;
        state.selectedElementIds = [];
        state.editingElementId = null;
      });
    },

    addSlide: (afterIndex) => {
      set((state) => {
        const index = afterIndex ?? state.courseware.slides.length - 1;
        const newSlide: Slide = {
          id: generateId('slide'),
          order: index + 1,
          title: '新页面',
          layout: {
            templateId: 'blank',
            variant: 'default',
            constraints: [],
          },
          background: { color: '#ffffff' },
          elements: [],
          transition: { type: 'fade', duration: 0.8, easing: 'power2.inOut' },
          timeline: { autoPlay: true },
        };

        state.courseware.slides.splice(index + 1, 0, newSlide);
        state.courseware.slides.forEach((slide, i) => {
          slide.order = i;
        });
        state.currentSlideId = newSlide.id;
        state.selectedElementId = null;
      });
    },

    addSlideWithElements: (slide) => {
      set((state) => {
        const index = state.courseware.slides.findIndex((s) => s.id === state.currentSlideId);
        const insertIndex = index >= 0 ? index : state.courseware.slides.length - 1;
        const newSlide: Slide = {
          ...JSON.parse(JSON.stringify(slide)),
          id: generateId('slide'),
          order: insertIndex + 1,
        };
        normalizeElementZIndices(newSlide.elements);
        state.courseware.slides.splice(insertIndex + 1, 0, newSlide);
        state.courseware.slides.forEach((s, i) => {
          s.order = i;
        });
        state.currentSlideId = newSlide.id;
        state.selectedElementId = null;
      });
    },

    duplicateSlide: (slideId) => {
      set((state) => {
        const index = state.courseware.slides.findIndex((s) => s.id === slideId);
        const slide = state.courseware.slides[index];
        if (!slide) return;

        const cloned: Slide = JSON.parse(JSON.stringify(slide));
        cloned.id = generateId('slide');
        cloned.title = `${cloned.title || '未命名页面'} 副本`;
        const clonedElements = cloneElementSet(slide.elements);
        cloned.elements = clonedElements.elements;
        cloned.layout.constraints = cloned.layout.constraints.map((constraint) => ({
          ...constraint,
          target: clonedElements.idMap.get(constraint.target) ?? constraint.target,
        }));
        if (cloned.stateMachine) {
          cloned.stateMachine = remapElementTargetIds(
            cloned.stateMachine,
            clonedElements.idMap,
          );
        }

        state.courseware.slides.splice(index + 1, 0, cloned);
        state.courseware.slides.forEach((s, i) => {
          s.order = i;
        });
        state.currentSlideId = cloned.id;
        state.selectedElementId = null;
      });
    },

    deleteSlide: (slideId) => {
      set((state) => {
        if (state.courseware.slides.length <= 1) return;
        const index = state.courseware.slides.findIndex((s) => s.id === slideId);
        if (index === -1) return;

        state.courseware.slides.splice(index, 1);
        state.courseware.slides.forEach((slide, i) => {
          slide.order = i;
        });

        if (state.currentSlideId === slideId) {
          const newIndex = Math.min(index, state.courseware.slides.length - 1);
          state.currentSlideId = state.courseware.slides[newIndex]?.id || null;
        }
        state.selectedElementId = null;
      });
    },

    moveSlide: (fromIndex, toIndex) => {
      set((state) => {
        const slides = state.courseware.slides;
        if (fromIndex < 0 || fromIndex >= slides.length) return;
        if (toIndex < 0 || toIndex >= slides.length) return;

        const [moved] = slides.splice(fromIndex, 1);
        slides.splice(toIndex, 0, moved);
        slides.forEach((slide, i) => {
          slide.order = i;
        });
      });
    },

    updateSlide: (slideId, updater) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (slide) {
          updater(slide);
          normalizeElementZIndices(slide.elements);
        }
      });
    },

    selectElement: (elementId) => {
      set((state) => {
        state.selectedElementId = elementId;
        state.selectedElementIds = elementId ? [elementId] : [];
        state.editingElementId = null;
      });
    },

    toggleElementSelection: (elementId) => {
      set((state) => {
        const index = state.selectedElementIds.indexOf(elementId);
        if (index >= 0) {
          state.selectedElementIds.splice(index, 1);
        } else {
          state.selectedElementIds.push(elementId);
        }
        state.selectedElementId = state.selectedElementIds[state.selectedElementIds.length - 1] || null;
        state.editingElementId = null;
      });
    },

    clearElementSelection: () => {
      set((state) => {
        state.selectedElementId = null;
        state.selectedElementIds = [];
        state.editingElementId = null;
      });
    },

    setEditingElement: (elementId) => {
      set((state) => {
        state.editingElementId = elementId;
        if (elementId) {
          state.selectedElementId = elementId;
          state.selectedElementIds = [elementId];
        }
      });
    },

    addElement: (slideId, element) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (slide) {
          normalizeElementZIndices([element]);
          slide.elements.push(element);
          moveElementToStackEdge(slide.elements, element.id, 'front');
          state.selectedElementId = element.id;
          state.selectedElementIds = [element.id];
          state.editingElementId = null;
        }
      });
    },

    deleteElement: (slideId, elementId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (slide) {
          slide.elements = slide.elements.filter((e) => e.id !== elementId);
        }
        if (state.selectedElementId === elementId) {
          state.selectedElementId = null;
        }
        state.selectedElementIds = state.selectedElementIds.filter((id) => id !== elementId);
      });
    },

    deleteSelectedElements: (slideId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (!slide) return;
        const ids = new Set(state.selectedElementIds);
        slide.elements = slide.elements.filter((e) => !ids.has(e.id));
        state.selectedElementId = null;
        state.selectedElementIds = [];
        state.editingElementId = null;
      });
    },

    updateElement: (slideId, elementId, updater) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const element = slide?.elements.find((e) => e.id === elementId);
        if (element) {
          updater(element);
          normalizeElementZIndices([element]);
        }
      });
    },

    batchUpdateElement: (slideId, elementId, updates) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const element = slide?.elements.find((e) => e.id === elementId);
        if (element) {
          Object.assign(element, updates);
          normalizeElementZIndices([element]);
        }
      });
    },

    duplicateElement: (slideId, elementId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const element = slide?.elements.find((e) => e.id === elementId);
        if (!slide || !element) return;

        const cloned = cloneElement(element, 20, 20);
        // Avoid placing duplicate exactly on top; cascade if many duplicates
        const offsetCount = slide.elements.filter((e) =>
          e.name?.startsWith(element.name || '元素'),
        ).length;
        cloned.geometry.x += offsetCount * 10;
        cloned.geometry.y += offsetCount * 10;

        normalizeElementZIndices([cloned]);
        slide.elements.push(cloned);
        moveElementToStackEdge(slide.elements, cloned.id, 'front');
        state.selectedElementId = cloned.id;
        state.selectedElementIds = [cloned.id];
        state.editingElementId = null;
      });
    },

    duplicateSelectedElements: (slideId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (!slide || state.selectedElementIds.length === 0) return;

        const selected = state.selectedElementIds
          .map((id) => slide.elements.find((element) => element.id === id))
          .filter((element): element is Element => Boolean(element));
        const cloned = cloneElementSet(
          selected,
          selected.map((_, index) => ({
            x: 20 + index * 10,
            y: 20 + index * 10,
          })),
        ).elements;
        normalizeElementZIndices(cloned);
        slide.elements.push(...cloned);
        const newIds = cloned.map((element) => element.id);
        newIds.forEach((id) => moveElementToStackEdge(slide.elements, id, 'front'));
        state.selectedElementIds = newIds;
        state.selectedElementId = newIds[newIds.length - 1] || null;
        state.editingElementId = null;
      });
    },

    distributeElements: (slideId, axis) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (!slide || slide.elements.length < 3) return;

        const sorted = [...slide.elements].sort((a, b) =>
          axis === 'horizontal'
            ? a.geometry.x - b.geometry.x
            : a.geometry.y - b.geometry.y,
        );

        const canvasSize = axis === 'horizontal' ? 1280 : 720;
        const totalOccupied = sorted.reduce((sum, el, i) => {
          const size = axis === 'horizontal' ? el.geometry.width : el.geometry.height;
          return sum + size + (i < sorted.length - 1 ? 0 : 0);
        }, 0);
        const available = canvasSize - totalOccupied;
        const gap = available / (sorted.length + 1);

        let position = gap;
        sorted.forEach((el) => {
          if (axis === 'horizontal') {
            el.geometry.x = Math.round(position);
            position += el.geometry.width + gap;
          } else {
            el.geometry.y = Math.round(position);
            position += el.geometry.height + gap;
          }
        });
      });
    },

    groupSelectedElements: (slideId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (!slide || state.selectedElementIds.length < 2) return;

        const selected = slide.elements.filter((e) => state.selectedElementIds.includes(e.id));
        if (selected.length < 2) return;

        const minX = Math.min(...selected.map((e) => e.geometry.x));
        const minY = Math.min(...selected.map((e) => e.geometry.y));
        const maxX = Math.max(...selected.map((e) => e.geometry.x + e.geometry.width));
        const maxY = Math.max(...selected.map((e) => e.geometry.y + e.geometry.height));

        const group: Element = {
          id: generateId('el'),
          type: 'group',
          semanticRole: 'shape',
          name: '组合',
          geometry: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            zIndex: clampElementZIndex(
              Math.max(...selected.map((e) => clampElementZIndex(e.geometry.zIndex))) + 1,
            ),
          },
          style: {},
          content: {
            children: selected.map((e) => ({
              ...JSON.parse(JSON.stringify(e)),
              geometry: {
                ...e.geometry,
                x: e.geometry.x - minX,
                y: e.geometry.y - minY,
              },
            })),
          },
          animation: { entrance: [], exit: [] },
          interactions: [],
        };
        normalizeElementZIndices([group]);

        slide.elements = slide.elements.filter((e) => !state.selectedElementIds.includes(e.id));
        slide.elements.push(group);
        state.selectedElementId = group.id;
        state.selectedElementIds = [group.id];
        state.editingElementId = null;
      });
    },

    ungroupSelectedElement: (slideId, groupId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const groupIndex = slide?.elements.findIndex((e) => e.id === groupId);
        if (!slide || groupIndex === undefined || groupIndex < 0) return;

        const group = slide.elements[groupIndex];
        if (group.type !== 'group') return;

        const groupRotation = group.geometry.rotation || 0;
        const theta = (groupRotation * Math.PI) / 180;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const cx = group.geometry.x + group.geometry.width / 2;
        const cy = group.geometry.y + group.geometry.height / 2;

        const children = (group.content.children as Element[] | undefined)?.map((child) => {
          const absX = group.geometry.x + child.geometry.x + child.geometry.width / 2;
          const absY = group.geometry.y + child.geometry.y + child.geometry.height / 2;
          const dx = absX - cx;
          const dy = absY - cy;
          const rotatedX = cx + dx * cos - dy * sin;
          const rotatedY = cy + dx * sin + dy * cos;

          return {
            ...JSON.parse(JSON.stringify(child)),
            geometry: {
              ...child.geometry,
              x: Math.round(rotatedX - child.geometry.width / 2),
              y: Math.round(rotatedY - child.geometry.height / 2),
              rotation: (child.geometry.rotation || 0) + groupRotation,
              zIndex: (child.geometry.zIndex ?? 1) + (group.geometry.zIndex ?? 1),
            },
          };
        }) || [];
        normalizeElementZIndices(children);

        slide.elements.splice(groupIndex, 1, ...children);
        state.selectedElementIds = children.map((c) => c.id);
        state.selectedElementId = children[children.length - 1]?.id || null;
        state.editingElementId = null;
      });
    },

    resizeGroup: (slideId, groupId, newGeometry) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const group = slide?.elements.find((e) => e.id === groupId);
        if (!slide || !group || group.type !== 'group') return;

        const old = group.geometry;
        const scaleX = old.width ? newGeometry.width / old.width : 1;
        const scaleY = old.height ? newGeometry.height / old.height : 1;

        group.geometry = { ...old, ...newGeometry };

        const children = group.content?.children as Element[] | undefined;
        if (children) {
          children.forEach((child) => {
            child.geometry.x = Math.round(child.geometry.x * scaleX);
            child.geometry.y = Math.round(child.geometry.y * scaleY);
            child.geometry.width = Math.max(1, Math.round(child.geometry.width * scaleX));
            child.geometry.height = Math.max(1, Math.round(child.geometry.height * scaleY));
          });
        }
      });
    },

    bringToFront: (slideId, elementId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const element = slide?.elements.find((e) => e.id === elementId);
        if (!slide || !element) return;

        moveElementToStackEdge(slide.elements, elementId, 'front');
      });
    },

    sendToBack: (slideId, elementId) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const element = slide?.elements.find((e) => e.id === elementId);
        if (!slide || !element) return;

        moveElementToStackEdge(slide.elements, elementId, 'back');
      });
    },

    nudgeElement: (slideId, elementId, dx, dy) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        const element = slide?.elements.find((e) => e.id === elementId);
        if (!element) return;

        element.geometry.x += dx;
        element.geometry.y += dy;
      });
    },

    nudgeSelectedElements: (slideId, dx, dy) => {
      set((state) => {
        const slide = state.courseware.slides.find((s) => s.id === slideId);
        if (!slide) return;
        const ids = new Set(state.selectedElementIds);
        slide.elements.forEach((el) => {
          if (ids.has(el.id)) {
            el.geometry.x += dx;
            el.geometry.y += dy;
          }
        });
      });
    },

    setIsPlaying: (isPlaying) => {
      set((state) => {
        state.isPlaying = isPlaying;
        if (isPlaying) {
          state.selectedElementId = null;
          state.selectedElementIds = [];
          state.editingElementId = null;
        }
      });
    },
  })),
);

// Re-export constants for convenience
export { DEFAULT_DESIGN_SYSTEM };
