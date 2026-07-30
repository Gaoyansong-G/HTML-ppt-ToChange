import { useCallback } from 'react';
import type { Asset } from '@courseware/shared';
import { useEditorStore } from '../../stores/editor.store';
import { useHistoryStore } from '../../stores/history.store';
import { deleteStoredAsset, findAssetUsages } from './asset-utils';

export function useCoursewareAssets() {
  const courseware = useEditorStore((state) => state.courseware);
  const setCourseware = useEditorStore((state) => state.setCourseware);
  const record = useHistoryStore((state) => state.record);
  const clearHistory = useHistoryStore((state) => state.clear);

  const addAssets = useCallback(
    (incoming: Asset[]) => {
      if (incoming.length === 0) return;
      const latest = useEditorStore.getState().courseware;
      const byId = new Map(latest.assets.map((asset) => [asset.id, asset]));
      incoming.forEach((asset) => byId.set(asset.id, asset));
      record(latest);
      setCourseware({
        ...latest,
        assets: Array.from(byId.values()),
        updatedAt: new Date().toISOString(),
      });
    },
    [record, setCourseware],
  );

  const removeAsset = useCallback(
    async (asset: Asset) => {
      const latest = useEditorStore.getState().courseware;
      const usages = findAssetUsages(latest, asset.id);
      if (usages.length > 0) {
        throw new Error(`该素材仍用于${usages.map((usage) => `“${usage.slideTitle}”`).join('、')}`);
      }

      await deleteStoredAsset(asset, latest.id);
      const current = useEditorStore.getState().courseware;
      if (!current.assets.some((item) => item.id === asset.id)) return;
      setCourseware({
        ...current,
        assets: current.assets.filter((item) => item.id !== asset.id),
        updatedAt: new Date().toISOString(),
      });
      // Physical deletion is intentionally irreversible. Every existing undo
      // snapshot may still contain this asset, so retaining history could
      // resurrect dead metadata whose binary has already been removed.
      clearHistory();
    },
    [clearHistory, setCourseware],
  );

  const getUsages = useCallback(
    (assetId: string) => findAssetUsages(courseware, assetId),
    [courseware],
  );

  return {
    assets: courseware.assets,
    addAssets,
    removeAsset,
    getUsages,
  };
}
