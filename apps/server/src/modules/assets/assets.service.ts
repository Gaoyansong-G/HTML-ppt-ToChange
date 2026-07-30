import { Injectable, NotFoundException } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { basename, extname, join, parse } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import type { Asset } from '@courseware/shared';
import { DatabaseService } from '../persistence/database.service';

const ASSETS_DIR = join(process.cwd(), 'generated', 'assets');
const INDEX_PATH = join(ASSETS_DIR, '.assets-index.json');
const INDEX_TEMP_PATH = join(ASSETS_DIR, '.assets-index.tmp');
const SAFE_ASSET_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

interface StoredAsset {
  asset: Asset;
  storageFilename: string;
}

interface AssetIndex {
  version: 1;
  entries: StoredAsset[];
}

function containsAssetReference(value: unknown, assetId: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsAssetReference(item, assetId));
  }
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => {
    if (
      (key === 'assetId' || key === 'imageAssetId') &&
      typeof item === 'string' &&
      item === assetId
    ) {
      return true;
    }
    return containsAssetReference(item, assetId);
  });
}

@Injectable()
export class AssetsService {
  private readonly assets = new Map<string, Asset>();
  private readonly storageFiles = new Map<string, string>();

  constructor(private readonly databaseService: DatabaseService) {
    mkdirSync(ASSETS_DIR, { recursive: true });
    this.loadIndex();
    this.recoverOrphanedFiles();
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  private inferType(ext: string): Asset['type'] {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const audioExts = ['.mp3', '.wav', '.ogg'];
    const videoExts = ['.mp4', '.webm', '.mov'];
    const fontExts = ['.woff2', '.ttf', '.otf', '.woff'];
    const lower = ext.toLowerCase();
    if (imageExts.includes(lower)) return 'image';
    if (audioExts.includes(lower)) return 'audio';
    if (videoExts.includes(lower)) return 'video';
    if (fontExts.includes(lower)) return 'font';
    return 'other';
  }

  private extensionForMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/ogg': '.ogg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
    };
    return map[mimeType.toLowerCase()] || '';
  }

  private sanitizeExtension(ext: string): string {
    const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return /^\.[a-z0-9]{1,8}$/.test(normalized) ? normalized : '';
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Partial<Asset> {
    if (!metadata) return {};
    const result: Partial<Asset> = {};
    if (typeof metadata.description === 'string') {
      result.description = metadata.description.slice(0, 2000);
    }
    if (typeof metadata.width === 'number' && Number.isFinite(metadata.width) && metadata.width > 0) {
      result.width = Math.round(metadata.width);
    }
    if (typeof metadata.height === 'number' && Number.isFinite(metadata.height) && metadata.height > 0) {
      result.height = Math.round(metadata.height);
    }
    return result;
  }

  private isStoredAsset(value: unknown): value is StoredAsset {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Partial<StoredAsset>;
    const asset = entry.asset as Partial<Asset> | undefined;
    return Boolean(
      asset &&
        typeof asset.id === 'string' &&
        SAFE_ASSET_ID.test(asset.id) &&
        typeof asset.filename === 'string' &&
        typeof asset.mimeType === 'string' &&
        typeof asset.url === 'string' &&
        typeof entry.storageFilename === 'string' &&
        basename(entry.storageFilename) === entry.storageFilename,
    );
  }

  private loadIndex(): void {
    if (!existsSync(INDEX_PATH)) return;
    try {
      const parsed = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as Partial<AssetIndex>;
      if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return;
      for (const entry of parsed.entries) {
        if (!this.isStoredAsset(entry)) continue;
        const filePath = join(ASSETS_DIR, entry.storageFilename);
        if (!existsSync(filePath)) continue;
        this.assets.set(entry.asset.id, entry.asset);
        this.storageFiles.set(entry.asset.id, entry.storageFilename);
      }
    } catch {
      // A damaged index must not make existing binary assets inaccessible.
      // recoverOrphanedFiles() rebuilds safe minimal metadata from exact filenames.
    }
  }

  private persistIndex(): void {
    const entries: StoredAsset[] = [];
    for (const [id, asset] of this.assets) {
      const storageFilename = this.storageFiles.get(id);
      if (storageFilename) entries.push({ asset, storageFilename });
    }
    const index: AssetIndex = { version: 1, entries };
    writeFileSync(INDEX_TEMP_PATH, JSON.stringify(index, null, 2), 'utf8');
    renameSync(INDEX_TEMP_PATH, INDEX_PATH);
  }

  /**
   * Backward compatibility for assets created before the metadata index existed.
   * Stored binaries have always used the exact form `${assetId}.${extension}`.
   */
  private recoverOrphanedFiles(): void {
    let changed = false;
    for (const filename of readdirSync(ASSETS_DIR)) {
      if (filename.startsWith('.')) continue;
      const parsed = parse(filename);
      const id = parsed.name;
      if (!SAFE_ASSET_ID.test(id) || this.assets.has(id)) continue;
      const filePath = join(ASSETS_DIR, filename);
      if (!statSync(filePath).isFile()) continue;

      const asset: Asset = {
        id,
        type: this.inferType(parsed.ext),
        filename,
        mimeType: this.getMimeType(parsed.ext),
        url: `/api/assets/${id}`,
        size: statSync(filePath).size,
      };
      this.assets.set(id, asset);
      this.storageFiles.set(id, filename);
      changed = true;
    }
    if (changed) this.persistIndex();
  }

  private async readImageDimensions(
    buffer: Buffer,
    type: Asset['type'],
  ): Promise<Pick<Asset, 'width' | 'height'>> {
    if (type !== 'image') return {};
    try {
      const metadata = await sharp(buffer, { animated: false }).metadata();
      return {
        ...(metadata.width ? { width: metadata.width } : {}),
        ...(metadata.height ? { height: metadata.height } : {}),
      };
    } catch {
      return {};
    }
  }

  async upload(file: Express.Multer.File, metadata?: Record<string, unknown>): Promise<Asset> {
    const id = `asset-${randomUUID()}`;
    const ext =
      this.sanitizeExtension(extname(file.originalname)) ||
      this.sanitizeExtension(this.extensionForMime(file.mimetype)) ||
      '.bin';
    const storageFilename = `${id}${ext}`;
    const filepath = join(ASSETS_DIR, storageFilename);
    const type = this.inferType(ext);
    const dimensions = await this.readImageDimensions(file.buffer, type);

    writeFileSync(filepath, file.buffer);

    const asset: Asset = {
      id,
      type,
      filename: basename(file.originalname) || `素材${ext}`,
      mimeType: this.getMimeType(ext) || file.mimetype,
      url: `/api/assets/${id}`,
      size: file.size,
      ...dimensions,
      ...this.sanitizeMetadata(metadata),
    };

    this.assets.set(id, asset);
    this.storageFiles.set(id, storageFilename);
    this.persistIndex();
    return asset;
  }

  /** 保存 AI 生成/外部下载的素材，并持久注册为可恢复的服务端资源。 */
  saveGenerated(buffer: Buffer, ext: string, metadata?: Record<string, unknown>): Asset {
    mkdirSync(ASSETS_DIR, { recursive: true });
    const safeExt = this.sanitizeExtension(ext) || '.bin';
    const id = `asset-${randomUUID()}`;
    const storageFilename = `${id}${safeExt}`;
    writeFileSync(join(ASSETS_DIR, storageFilename), buffer);

    const asset: Asset = {
      id,
      type: this.inferType(safeExt),
      filename: storageFilename,
      mimeType: this.getMimeType(safeExt),
      url: `/api/assets/${id}`,
      size: buffer.length,
      ...this.sanitizeMetadata(metadata),
    };
    this.assets.set(id, asset);
    this.storageFiles.set(id, storageFilename);
    this.persistIndex();
    return asset;
  }

  list(): Asset[] {
    return Array.from(this.assets.values());
  }

  findById(id: string): Asset | undefined {
    if (!SAFE_ASSET_ID.test(id)) return undefined;
    return this.assets.get(id);
  }

  findFileById(id: string): { asset: Asset; buffer: Buffer } | null {
    const stored = this.findStoredFileById(id);
    if (!stored) return null;
    return { asset: stored.asset, buffer: readFileSync(stored.filepath) };
  }

  findStoredFileById(
    id: string,
  ): { asset: Asset; filepath: string; size: number } | null {
    if (!SAFE_ASSET_ID.test(id)) return null;
    const asset = this.assets.get(id);
    const storageFilename = this.storageFiles.get(id);
    if (!asset || !storageFilename) return null;

    const filepath = join(ASSETS_DIR, storageFilename);
    if (!existsSync(filepath)) return null;
    return { asset, filepath, size: statSync(filepath).size };
  }

  remove(
    id: string,
    sourceCoursewareId?: string,
  ): { id: string; deleted: boolean; shared?: true } {
    if (!SAFE_ASSET_ID.test(id)) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    const asset = this.assets.get(id);
    const storageFilename = this.storageFiles.get(id);
    if (!asset || !storageFilename) {
      throw new NotFoundException(`Asset ${id} not found`);
    }

    const referencedBy = this.databaseService
      .listCoursewares()
      .filter((row) => row.id !== sourceCoursewareId)
      .flatMap((row) => {
        try {
          const courseware = JSON.parse(row.data) as {
            title?: string;
            assets?: Array<{ id?: string }>;
            slides?: unknown[];
          };
          return courseware.assets?.some((item) => item.id === id) ||
            containsAssetReference(courseware.slides, id)
            ? [{ id: row.id, title: courseware.title || row.title || row.id }]
            : [];
        } catch {
          return [];
        }
      });
    if (referencedBy.length > 0) {
      // The caller may still remove this asset from its own library metadata,
      // but the shared binary must remain available to the other coursewares.
      return { id, deleted: false, shared: true };
    }

    const filepath = join(ASSETS_DIR, storageFilename);
    if (existsSync(filepath)) unlinkSync(filepath);
    this.assets.delete(id);
    this.storageFiles.delete(id);
    this.persistIndex();
    return { id, deleted: true };
  }
}
