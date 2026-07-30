import type { Asset, Courseware } from '@courseware/shared';
import { API_BASE } from '../../lib/api';

export const ASSET_FILE_ACCEPT =
  'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,video/quicktime,.mov';

const SUPPORTED_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'mp3',
  'wav',
  'ogg',
  'mp4',
  'webm',
  'mov',
]);

const MAX_ASSET_SIZE = 100 * 1024 * 1024;

export interface AssetUploadProgress {
  fileName: string;
  fileIndex: number;
  fileCount: number;
  percent: number;
}

export class AssetBatchUploadError extends Error {
  constructor(
    message: string,
    readonly uploadedAssets: Asset[],
  ) {
    super(message);
    this.name = 'AssetBatchUploadError';
  }
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return '大小未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function assetTypeLabel(type: Asset['type']): string {
  const labels: Record<Asset['type'], string> = {
    image: '图片',
    audio: '音频',
    video: '视频',
    font: '字体',
    other: '其他',
  };
  return labels[type];
}

export function isSupportedAssetFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return (
    file.size > 0 &&
    file.size <= MAX_ASSET_SIZE &&
    /^(image|audio|video)\//i.test(file.type) &&
    SUPPORTED_EXTENSIONS.has(extension)
  );
}

export function validateAssetFiles(files: File[]): void {
  if (files.length === 0) throw new Error('没有找到可上传的文件');
  const empty = files.find((file) => file.size === 0);
  if (empty) throw new Error(`“${empty.name}”是空文件，无法上传`);
  const oversized = files.find((file) => file.size > MAX_ASSET_SIZE);
  if (oversized) throw new Error(`“${oversized.name}”超过 100 MB，无法上传`);
  const unsupported = files.find((file) => !isSupportedAssetFile(file));
  if (unsupported) {
    throw new Error(
      `不支持“${unsupported.name}”。请选择常用图片、MP3/WAV/OGG 音频或 MP4/WebM/MOV 视频`,
    );
  }
}

function readUploadError(xhr: XMLHttpRequest, fileName: string): string {
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join('；') : body.message;
    if (message) return message;
  } catch {
    // Fall through to a stable user-facing message.
  }
  if (xhr.status === 413) return `“${fileName}”超过服务器允许的大小`;
  return `“${fileName}”上传失败（${xhr.status || '网络错误'}）`;
}

function uploadOne(
  file: File,
  onProgress: (loaded: number, total: number) => void,
): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/assets/upload`);
    xhr.responseType = 'json';
    xhr.upload.addEventListener('progress', (event) => {
      onProgress(event.loaded, event.lengthComputable ? event.total : file.size);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response =
          xhr.response && typeof xhr.response === 'object'
            ? (xhr.response as Asset)
            : (JSON.parse(xhr.responseText) as Asset);
        resolve(response);
        return;
      }
      reject(new Error(readUploadError(xhr, file.name)));
    });
    xhr.addEventListener('error', () => reject(new Error(`“${file.name}”上传失败，请检查网络连接`)));
    xhr.addEventListener('abort', () => reject(new Error(`已取消上传“${file.name}”`)));
    xhr.send(formData);
  });
}

export async function uploadAssetFiles(
  files: File[],
  onProgress?: (progress: AssetUploadProgress) => void,
): Promise<Asset[]> {
  validateAssetFiles(files);
  const uploaded: Asset[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    try {
      const asset = await uploadOne(file, (loaded, total) => {
        const currentRatio = total > 0 ? Math.min(1, loaded / total) : 0;
        onProgress?.({
          fileName: file.name,
          fileIndex: index,
          fileCount: files.length,
          percent: Math.round(((index + currentRatio) / files.length) * 100),
        });
      });
      uploaded.push(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : `“${file.name}”上传失败`;
      throw new AssetBatchUploadError(message, uploaded);
    }
    onProgress?.({
      fileName: file.name,
      fileIndex: index,
      fileCount: files.length,
      percent: Math.round(((index + 1) / files.length) * 100),
    });
  }

  return uploaded;
}

function containsAssetReference(value: unknown, assetId: string, seen = new WeakSet<object>()): boolean {
  if (value === assetId) return true;
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value as object)) return false;
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.some((item) => containsAssetReference(item, assetId, seen));
  }
  return Object.values(value as Record<string, unknown>).some((item) =>
    containsAssetReference(item, assetId, seen),
  );
}

export interface AssetUsage {
  slideId: string;
  slideTitle: string;
}

export function findAssetUsages(courseware: Courseware, assetId: string): AssetUsage[] {
  return courseware.slides
    .filter((slide) => containsAssetReference(slide, assetId))
    .map((slide, index) => ({
      slideId: slide.id,
      slideTitle: slide.title || `第 ${index + 1} 页`,
    }));
}

export async function deleteStoredAsset(asset: Asset, coursewareId?: string): Promise<void> {
  if (!asset.url.includes('/api/assets/')) return;
  const coursewareQuery = coursewareId
    ? `?coursewareId=${encodeURIComponent(coursewareId)}`
    : '';
  const response = await fetch(
    `${API_BASE}/assets/${encodeURIComponent(asset.id)}${coursewareQuery}`,
    { method: 'DELETE' },
  );
  // A missing physical file should not trap stale metadata in a courseware forever.
  if (!response.ok && response.status !== 404) {
    let message = `删除“${asset.filename}”失败`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join('；') : body.message;
      }
    } catch {
      // Keep the stable fallback message.
    }
    throw new Error(message);
  }
}
