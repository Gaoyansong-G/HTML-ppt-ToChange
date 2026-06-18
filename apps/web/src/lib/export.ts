import type { Courseware, Asset } from '@courseware/shared';
import { CoursewareSchema } from '@courseware/shared';
import JSZip from 'jszip';

export async function exportCoursewarePackage(courseware: Courseware): Promise<Blob> {
  const zip = new JSZip();
  zip.file('courseware.json', JSON.stringify(courseware, null, 2));

  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    for (const asset of courseware.assets || []) {
      if (asset.url.startsWith('data:')) {
        const base64 = asset.url.split(',')[1];
        if (base64) {
          assetsFolder.file(asset.filename, base64, { base64: true });
        }
      } else if (asset.url.startsWith('blob:')) {
        try {
          const response = await fetch(asset.url);
          const blob = await response.blob();
          assetsFolder.file(asset.filename, blob);
        } catch {
          console.warn(`[Export] Failed to fetch blob asset: ${asset.id}`);
        }
      }
    }
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

  // Rebuild asset URLs from package files
  const assetFiles = zip.folder('assets');
  if (assetFiles) {
    const assetMap = new Map<string, Asset>();
    for (const asset of courseware.assets || []) {
      const file = assetFiles.file(asset.filename);
      if (file) {
        const buffer = await file.async('arraybuffer');
        const blob = new Blob([buffer], { type: asset.mimeType });
        asset.url = URL.createObjectURL(blob);
      }
      assetMap.set(asset.id, asset);
    }
  }

  return courseware;
}

export async function exportHtml(courseware: Courseware): Promise<Blob> {
  const response = await fetch('/standalone-player.html');
  if (!response.ok) {
    throw new Error('Standalone player template not found. Please build the standalone player first.');
  }
  let html = await response.text();

  const injection = `window.__COURSEWARE__ = ${JSON.stringify(courseware)};`;
  html = html.replace('window.__COURSEWARE__ = null;', injection);

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
