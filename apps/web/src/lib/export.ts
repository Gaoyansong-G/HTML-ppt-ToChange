import type { Courseware, Asset } from '@courseware/shared';
import { CoursewareSchema } from '@courseware/shared';
import JSZip from 'jszip';
import { API_BASE } from './api';

export async function exportCoursewarePackage(courseware: Courseware): Promise<Blob> {
  const zip = new JSZip();
  zip.file('courseware.json', JSON.stringify(courseware, null, 2));

  const assetsFolder = zip.folder('assets');
  const failedAssets: string[] = [];
  if (assetsFolder) {
    for (const asset of courseware.assets || []) {
      const extension = asset.filename.includes('.')
        ? asset.filename.slice(asset.filename.lastIndexOf('.'))
        : '';
      const packageFilename = `${asset.id}${extension}`;
      if (
        asset.url.startsWith('data:') ||
        asset.url.startsWith('blob:') ||
        asset.url.startsWith('/api/') ||
        asset.url.startsWith('http')
      ) {
        // 统一交给浏览器解码，兼容 base64 与 utf8/percent-encoded data URL。
        try {
          const response = await fetch(asset.url);
          if (!response.ok) throw new Error(String(response.status));
          const bytes = await response.arrayBuffer();
          assetsFolder.file(packageFilename, bytes);
        } catch {
          failedAssets.push(asset.filename || asset.id);
        }
      } else {
        failedAssets.push(asset.filename || asset.id);
      }
    }
  }

  if (failedAssets.length > 0) {
    throw new Error(
      `以下素材无法写入课件包，请先在素材库中修复：${failedAssets.slice(0, 8).join('、')}${
        failedAssets.length > 8 ? ` 等 ${failedAssets.length} 项` : ''
      }`,
    );
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function importCoursewarePackage(file: File): Promise<Courseware> {
  const zip = await JSZip.loadAsync(file);
  const coursewareJson = await zip.file('courseware.json')?.async('string');
  if (!coursewareJson) {
    throw new Error('Invalid .courseware package: courseware.json not found');
  }

  const parsed = JSON.parse(coursewareJson);
  const result = CoursewareSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.error.message}`);
  }

  const courseware = result.data;
  const seenAssetIds = new Set<string>();
  const duplicateAssetIds = new Set<string>();
  for (const asset of courseware.assets || []) {
    if (seenAssetIds.has(asset.id)) duplicateAssetIds.add(asset.id);
    seenAssetIds.add(asset.id);
  }
  if (duplicateAssetIds.size > 0) {
    throw new Error(
      `课件包包含重复的素材编号：${Array.from(duplicateAssetIds).slice(0, 8).join('、')}`,
    );
  }

  // Rebuild asset URLs from package files. A package must never silently
  // restore a server/blob URL whose underlying file is no longer available.
  const assetFiles = zip.folder('assets');
  const missingAssets: string[] = [];
  for (const asset of courseware.assets || []) {
    // 兼容两种包内命名：原始 filename 与 ${id}${ext}（服务端导出约定）
    const ext = asset.filename.includes('.') ? asset.filename.slice(asset.filename.lastIndexOf('.')) : '';
    const packagedFile =
      assetFiles?.file(`${asset.id}${ext}`) ||
      assetFiles?.file(asset.id) ||
      assetFiles?.file(asset.filename);
    if (packagedFile) {
      const base64 = await packagedFile.async('base64');
      asset.url = `data:${asset.mimeType};base64,${base64}`;
    } else if (!asset.url.startsWith('data:')) {
      missingAssets.push(asset.filename || asset.id);
    }
  }

  if (missingAssets.length > 0) {
    throw new Error(
      `课件包缺少素材文件：${missingAssets.slice(0, 8).join('、')}${
        missingAssets.length > 8 ? ` 等 ${missingAssets.length} 项` : ''
      }`,
    );
  }

  return courseware;
}

function remapAssetReferences(
  value: unknown,
  ids: Map<string, string>,
  fieldName?: string,
): unknown {
  if (typeof value === 'string') {
    return fieldName === 'assetId' || fieldName === 'imageAssetId'
      ? ids.get(value) ?? value
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => remapAssetReferences(item, ids, fieldName));
  }
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      remapAssetReferences(item, ids, key),
    ]),
  );
}

/**
 * Package assets are initially represented as data URLs so merely inspecting
 * or cancelling an import never leaks temporary browser URLs. Once confirmed,
 * upload them to durable server storage and rewrite every slide reference.
 */
export async function persistImportedCoursewareAssets(courseware: Courseware): Promise<Courseware> {
  const imported: Courseware = JSON.parse(JSON.stringify(courseware));
  const idMap = new Map<string, string>();
  const durableAssets: Asset[] = [];
  const uploadedIds: string[] = [];

  try {
    for (const asset of imported.assets || []) {
      if (
        !asset.url.startsWith('data:') ||
        !['image', 'audio', 'video'].includes(asset.type)
      ) {
        durableAssets.push(asset);
        continue;
      }

      const blob = await (await fetch(asset.url)).blob();
      const formData = new FormData();
      formData.append(
        'file',
        new File([blob], asset.filename || `${asset.id}.bin`, {
          type: asset.mimeType || blob.type,
        }),
      );
      const response = await fetch(`${API_BASE}/assets/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        let message = `素材“${asset.filename || asset.id}”导入失败`;
        try {
          const body = (await response.json()) as { message?: string | string[] };
          if (body.message) {
            message = Array.isArray(body.message) ? body.message.join('；') : body.message;
          }
        } catch {
          // Keep the stable filename-based message.
        }
        throw new Error(message);
      }
      const stored = (await response.json()) as Asset;
      if (!stored.id || !stored.url) throw new Error('服务器返回了无效的素材信息');
      uploadedIds.push(stored.id);
      idMap.set(asset.id, stored.id);
      durableAssets.push({
        ...stored,
        description: asset.description || stored.description,
      });
    }

    const remapped = remapAssetReferences(
      { ...imported, assets: durableAssets },
      idMap,
    );
    const parsed = CoursewareSchema.safeParse(remapped);
    if (!parsed.success) {
      throw new Error(`导入后课件校验失败：${parsed.error.message}`);
    }
    return parsed.data;
  } catch (error) {
    await Promise.allSettled(
      uploadedIds.map((id) =>
        fetch(`${API_BASE}/assets/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      ),
    );
    throw error;
  }
}

/** 把素材 URL 转成 data URL（离线导出用）。失败返回 null（保留原 URL） */
async function assetToDataUrl(asset: Asset): Promise<string | null> {
  try {
    if (asset.url.startsWith('data:')) return asset.url;
    const resp = await fetch(asset.url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportHtml(courseware: Courseware): Promise<Blob> {
  const response = await fetch('/standalone-player.html');
  if (!response.ok) {
    throw new Error('Standalone player template not found. Please build the standalone player first.');
  }
  let html = await response.text();
  const marker = 'window.__COURSEWARE__ = null;';
  if (!html.includes(marker)) {
    throw new Error('独立播放器模板版本不兼容，请重新构建播放器后再导出。');
  }

  // 图片本地化：全部素材转 base64 内联，保证导出 HTML 离线可用
  const cloned: Courseware = JSON.parse(JSON.stringify(courseware));
  const CONCURRENCY = 4;
  const assets = cloned.assets || [];
  const failedAssets: string[] = [];
  for (let i = 0; i < assets.length; i += CONCURRENCY) {
    await Promise.all(
      assets.slice(i, i + CONCURRENCY).map(async (asset) => {
        const dataUrl = await assetToDataUrl(asset);
        if (dataUrl) {
          asset.url = dataUrl;
        } else {
          failedAssets.push(asset.filename || asset.id);
        }
      }),
    );
  }

  if (failedAssets.length > 0) {
    throw new Error(
      `无法生成完整离线 HTML，以下素材读取失败：${failedAssets.slice(0, 8).join('、')}${
        failedAssets.length > 8 ? ` 等 ${failedAssets.length} 项` : ''
      }`,
    );
  }

  // 防止课件文本中的 </script> 提前闭合脚本标签，同时兼容 JS 行分隔符。
  const safeJson = JSON.stringify(cloned)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const injection = `window.__COURSEWARE__ = ${safeJson};`;
  html = html.replace(marker, injection);

  return new Blob([html], { type: 'text/html' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
