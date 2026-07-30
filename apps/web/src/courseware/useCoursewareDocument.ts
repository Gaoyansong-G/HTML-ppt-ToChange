import { useCallback, useEffect, useRef, useState } from 'react';
import { CoursewareSchema, type Courseware } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { API_BASE } from '../lib/api';

export type DocumentLoadStatus = 'loading' | 'ready' | 'not-found' | 'error';
export type DocumentSaveStatus =
  | 'saved'
  | 'dirty'
  | 'saving'
  | 'error'
  | 'conflict'
  | 'deleted';

interface LocalDraft {
  documentId: string;
  savedAt: number;
  courseware: Courseware;
}

export interface DraftRecovery {
  savedAt: number;
  courseware: Courseware;
}

export interface CoursewareDocumentLifecycle {
  loadStatus: DocumentLoadStatus;
  loadError: string | null;
  saveStatus: DocumentSaveStatus;
  saveError: string | null;
  lastSavedAt: number | null;
  recovery: DraftRecovery | null;
  saveNow: () => Promise<boolean>;
  retryLoad: () => void;
  reloadFromServer: () => void;
  recoverDraft: () => void;
  discardDraft: () => void;
  saveAsCopy: () => Promise<Courseware | null>;
}

const AUTOSAVE_DELAY_MS = 1200;
const DRAFT_INTERVAL_MS = 300;

function draftKey(documentId: string) {
  return `cw.document-draft.${documentId}`;
}

/**
 * Server-owned timestamps and revision numbers do not represent author edits.
 * Excluding them prevents a successful save response from immediately making
 * the document look dirty again.
 */
function contentSignature(courseware: Courseware) {
  const { updatedAt: _updatedAt, revision: _revision, ...content } = courseware;
  return JSON.stringify(content);
}

function readDraft(documentId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(documentId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LocalDraft>;
    if (value.documentId !== documentId || typeof value.savedAt !== 'number') return null;
    const parsed = CoursewareSchema.safeParse(value.courseware);
    if (!parsed.success || parsed.data.id !== documentId) return null;
    return {
      documentId,
      savedAt: value.savedAt,
      courseware: parsed.data,
    };
  } catch {
    return null;
  }
}

function writeDraft(documentId: string, courseware: Courseware) {
  try {
    const draft: LocalDraft = {
      documentId,
      savedAt: Date.now(),
      courseware,
    };
    localStorage.setItem(draftKey(documentId), JSON.stringify(draft));
  } catch {
    // Autosave to the server remains available if browser storage is disabled
    // or full, so a local-storage failure must not interrupt editing.
  }
}

function removeDraft(documentId: string) {
  try {
    localStorage.removeItem(draftKey(documentId));
  } catch {
    // See writeDraft.
  }
}

async function parseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join('；');
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Owns loading, local recovery, optimistic updates and autosave for one route
 * document. Editor UI state remains in Zustand, while all persistence state is
 * deliberately isolated to the route id.
 */
export function useCoursewareDocument(documentId: string): CoursewareDocumentLifecycle {
  const setCourseware = useEditorStore((state) => state.setCourseware);
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide);
  const clearElementSelection = useEditorStore((state) => state.clearElementSelection);
  const clearHistory = useHistoryStore((state) => state.clear);

  const [loadStatus, setLoadStatus] = useState<DocumentLoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<DocumentSaveStatus>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<DraftRecovery | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const activeDocumentIdRef = useRef<string | null>(null);
  const lastSavedSignatureRef = useRef('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDraftWriteAtRef = useRef(Date.now());
  const requestInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const dirtyRef = useRef(false);
  const pendingRecoveryRef = useRef(false);
  const serverDocumentRef = useRef<Courseware | null>(null);
  const documentMissingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    saveTimerRef.current = null;
    draftTimerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    const controller = new AbortController();
    clearTimers();
    activeDocumentIdRef.current = null;
    lastSavedSignatureRef.current = '';
    serverDocumentRef.current = null;
    dirtyRef.current = false;
    queuedSaveRef.current = false;
    pendingRecoveryRef.current = false;
    documentMissingRef.current = false;
    lastDraftWriteAtRef.current = Date.now();
    setLoadStatus('loading');
    setLoadError(null);
    setSaveStatus('saved');
    setSaveError(null);
    setRecovery(null);
    clearHistory();

    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/courseware/${encodeURIComponent(documentId)}`, {
          signal: controller.signal,
        });
        if (response.status === 404) {
          if (controller.signal.aborted) return;
          const localDraft = readDraft(documentId);
          if (!localDraft) {
            setLoadStatus('not-found');
            return;
          }

          activeDocumentIdRef.current = documentId;
          documentMissingRef.current = true;
          dirtyRef.current = true;
          setCourseware(localDraft.courseware);
          if (localDraft.courseware.slides[0]) {
            setCurrentSlide(localDraft.courseware.slides[0].id);
          } else {
            clearElementSelection();
          }
          clearHistory();
          setLastSavedAt(localDraft.savedAt);
          setSaveStatus('deleted');
          setSaveError('原课件已被删除，本地草稿仍可编辑，请另存为副本');
          setLoadStatus('ready');
          return;
        }
        if (!response.ok) {
          throw new Error(await parseError(response, `加载失败（${response.status}）`));
        }

        const parsed = CoursewareSchema.safeParse(await response.json());
        if (!parsed.success) {
          throw new Error('服务器返回的课件格式无效');
        }
        const serverCourseware: Courseware = {
          ...parsed.data,
          revision: parsed.data.revision ?? 1,
        };
        if (serverCourseware.id !== documentId) {
          throw new Error('服务器返回了错误的课件');
        }

        activeDocumentIdRef.current = documentId;
        serverDocumentRef.current = serverCourseware;
        lastSavedSignatureRef.current = contentSignature(serverCourseware);
        setCourseware(serverCourseware);
        if (serverCourseware.slides[0]) {
          setCurrentSlide(serverCourseware.slides[0].id);
        } else {
          clearElementSelection();
        }
        clearHistory();
        setLastSavedAt(Date.parse(serverCourseware.updatedAt) || Date.now());

        const localDraft = readDraft(documentId);
        if (
          localDraft &&
          contentSignature(localDraft.courseware) !== contentSignature(serverCourseware)
        ) {
          pendingRecoveryRef.current = true;
          setRecovery({
            savedAt: localDraft.savedAt,
            courseware: localDraft.courseware,
          });
        } else if (localDraft) {
          removeDraft(documentId);
        }

        setLoadStatus('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : '课件加载失败');
        setLoadStatus('error');
      }
    })();

    return () => {
      controller.abort();
      if (dirtyRef.current) {
        const latest = useEditorStore.getState().courseware;
        if (latest.id === documentId) writeDraft(documentId, latest);
      }
      activeDocumentIdRef.current = null;
    };
  }, [
    clearElementSelection,
    clearHistory,
    clearTimers,
    documentId,
    reloadToken,
    setCourseware,
    setCurrentSlide,
  ]);

  const performSaveRef = useRef<() => Promise<boolean>>(async () => false);

  const performSave = useCallback(async () => {
    if (activeDocumentIdRef.current !== documentId || requestInFlightRef.current) {
      queuedSaveRef.current = requestInFlightRef.current;
      return false;
    }

    const current = useEditorStore.getState().courseware;
    if (current.id !== documentId) return false;
    if (documentMissingRef.current) {
      dirtyRef.current = true;
      writeDraft(documentId, current);
      setSaveStatus('deleted');
      setSaveError('原课件已被删除，本地修改仍可编辑，请另存为副本');
      return false;
    }
    const signatureAtStart = contentSignature(current);
    if (signatureAtStart === lastSavedSignatureRef.current) {
      dirtyRef.current = false;
      setSaveStatus('saved');
      setSaveError(null);
      removeDraft(documentId);
      return true;
    }

    requestInFlightRef.current = true;
    queuedSaveRef.current = false;
    setSaveStatus('saving');
    setSaveError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (current.revision != null) {
        headers['If-Match'] = `"${current.revision}"`;
      }
      const response = await fetch(`${API_BASE}/courseware/${encodeURIComponent(documentId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(current),
      });

      // A save may finish after the user has navigated to another document.
      // The old request may persist its own document, but must never update the
      // new route's UI or persistence baselines.
      if (activeDocumentIdRef.current !== documentId) return false;

      if (response.status === 409) {
        dirtyRef.current = true;
        setSaveStatus('conflict');
        setSaveError(await parseError(response, '课件已在另一个窗口中更新'));
        return false;
      }
      if (response.status === 404) {
        documentMissingRef.current = true;
        dirtyRef.current = true;
        queuedSaveRef.current = false;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        const latest = useEditorStore.getState().courseware;
        if (latest.id === documentId) writeDraft(documentId, latest);
        setSaveStatus('deleted');
        setSaveError('原课件已被删除，本地修改仍可编辑，请另存为副本');
        return false;
      }
      if (!response.ok) {
        throw new Error(await parseError(response, `保存失败（${response.status}）`));
      }

      const parsed = CoursewareSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('服务器返回的保存结果格式无效');
      const saved = parsed.data;
      serverDocumentRef.current = saved;
      lastSavedSignatureRef.current = contentSignature(saved);
      setLastSavedAt(Date.parse(saved.updatedAt) || Date.now());

      const latest = useEditorStore.getState().courseware;
      if (latest.id !== documentId) return true;
      if (contentSignature(latest) === signatureAtStart) {
        setCourseware(saved);
        dirtyRef.current = false;
        setSaveStatus('saved');
        removeDraft(documentId);
      } else {
        // Preserve edits made while the request was in flight, but advance the
        // local revision to the one the server just returned.
        setCourseware({
          ...latest,
          revision: saved.revision,
          updatedAt: saved.updatedAt,
          createdAt: saved.createdAt,
        });
        dirtyRef.current = true;
        queuedSaveRef.current = true;
        setSaveStatus('dirty');
      }
      return true;
    } catch (error) {
      if (activeDocumentIdRef.current !== documentId) return false;
      dirtyRef.current = true;
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : '保存失败');
      return false;
    } finally {
      requestInFlightRef.current = false;
      if (queuedSaveRef.current && activeDocumentIdRef.current === documentId) {
        queuedSaveRef.current = false;
        saveTimerRef.current = setTimeout(() => {
          void performSaveRef.current();
        }, 100);
      }
    }
  }, [documentId, setCourseware]);

  performSaveRef.current = performSave;

  // Subscribe directly so every editor mutation participates in recovery and
  // autosave without requiring individual controls to know about persistence.
  useEffect(() => {
    if (loadStatus !== 'ready' || activeDocumentIdRef.current !== documentId) return;

    const inspect = (courseware: Courseware) => {
      if (courseware.id !== documentId) return;

      const scheduleDraft = () => {
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
        const draftDelay = Math.max(
          0,
          DRAFT_INTERVAL_MS - (Date.now() - lastDraftWriteAtRef.current),
        );
        draftTimerRef.current = setTimeout(() => {
          const latest = useEditorStore.getState().courseware;
          if (latest.id === documentId) {
            writeDraft(documentId, latest);
            lastDraftWriteAtRef.current = Date.now();
          }
        }, draftDelay);
      };

      if (documentMissingRef.current) {
        dirtyRef.current = true;
        setSaveStatus('deleted');
        setSaveError((message) => message || '原课件已被删除，本地修改仍可编辑，请另存为副本');
        scheduleDraft();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        return;
      }

      const signature = contentSignature(courseware);
      if (signature === lastSavedSignatureRef.current) {
        dirtyRef.current = false;
        setSaveStatus('saved');
        setSaveError(null);
        if (!pendingRecoveryRef.current) removeDraft(documentId);
        return;
      }

      dirtyRef.current = true;
      setSaveStatus((status) => (status === 'conflict' ? status : 'dirty'));

      scheduleDraft();

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void performSaveRef.current();
      }, AUTOSAVE_DELAY_MS);
    };

    inspect(useEditorStore.getState().courseware);
    return useEditorStore.subscribe((state, previous) => {
      if (state.courseware !== previous.courseware) inspect(state.courseware);
    });
  }, [documentId, loadStatus]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !requestInFlightRef.current) return;
      const latest = useEditorStore.getState().courseware;
      if (latest.id === documentId) writeDraft(documentId, latest);
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [documentId]);

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    return performSaveRef.current();
  }, []);

  const retryLoad = useCallback(() => setReloadToken((value) => value + 1), []);

  const reloadFromServer = useCallback(() => {
    pendingRecoveryRef.current = false;
    documentMissingRef.current = false;
    dirtyRef.current = false;
    removeDraft(documentId);
    setRecovery(null);
    setReloadToken((value) => value + 1);
  }, [documentId]);

  const recoverDraft = useCallback(() => {
    if (!recovery || !serverDocumentRef.current) return;
    const server = serverDocumentRef.current;
    const recovered: Courseware = {
      ...recovery.courseware,
      id: server.id,
      revision: server.revision,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    };
    clearHistory();
    pendingRecoveryRef.current = false;
    setCourseware(recovered);
    if (recovered.slides[0]) setCurrentSlide(recovered.slides[0].id);
    setRecovery(null);
  }, [clearHistory, recovery, setCourseware, setCurrentSlide]);

  const discardDraft = useCallback(() => {
    pendingRecoveryRef.current = false;
    removeDraft(documentId);
    setRecovery(null);
  }, [documentId]);

  const saveAsCopy = useCallback(async () => {
    const current = useEditorStore.getState().courseware;
    if (current.id !== documentId) return null;
    const now = new Date().toISOString();
    const copy: Courseware = {
      ...current,
      id: `cw-${crypto.randomUUID()}`,
      title: `${current.title}${documentMissingRef.current ? '（恢复副本）' : '（冲突副本）'}`,
      revision: undefined,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const response = await fetch(`${API_BASE}/courseware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy),
      });
      if (!response.ok) {
        throw new Error(await parseError(response, `另存失败（${response.status}）`));
      }
      const parsed = CoursewareSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('服务器返回的副本格式无效');
      dirtyRef.current = false;
      removeDraft(documentId);
      return parsed.data;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '另存副本失败');
      return null;
    }
  }, [documentId]);

  return {
    loadStatus,
    loadError,
    saveStatus,
    saveError,
    lastSavedAt,
    recovery,
    saveNow,
    retryLoad,
    reloadFromServer,
    recoverDraft,
    discardDraft,
    saveAsCopy,
  };
}
