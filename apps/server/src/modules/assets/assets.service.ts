import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Asset } from '@courseware/shared';

const ASSETS_DIR = join(process.cwd(), 'generated', 'assets');

@Injectable()
export class AssetsService {
  private assets = new Map<string, Asset>();

  constructor() {
    if (!existsSync(ASSETS_DIR)) {
      mkdirSync(ASSETS_DIR, { recursive: true });
    }
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
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  async upload(file: Express.Multer.File, metadata?: Record<string, unknown>): Promise<Asset> {
    const id = `asset-${randomUUID()}`;
    const ext = extname(file.originalname);
    const filename = `${id}${ext}`;
    const filepath = join(ASSETS_DIR, filename);

    writeFileSync(filepath, file.buffer);

    const asset: Asset = {
      id,
      type: this.inferType(ext),
      filename: file.originalname,
      mimeType: this.getMimeType(ext),
      url: `/api/assets/${id}`,
      size: file.size,
      ...(metadata || {}),
    };

    this.assets.set(id, asset);
    return asset;
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

  findById(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  findFileById(id: string): { asset: Asset; buffer: Buffer } | null {
    const asset = this.assets.get(id);
    if (!asset) return null;

    const ext = extname(asset.filename);
    const filepath = join(ASSETS_DIR, `${id}${ext}`);
    if (!existsSync(filepath)) return null;

    return { asset, buffer: readFileSync(filepath) };
  }

  remove(id: string): { id: string } {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    this.assets.delete(id);
    return { id };
  }
}
