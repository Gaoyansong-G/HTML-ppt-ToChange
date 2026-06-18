import { Injectable, NotFoundException } from '@nestjs/common';
import { CoursewareSchema, type Courseware } from '@courseware/shared';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import { extname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { AssetsService } from '../assets/assets.service';

const ASSETS_DIR = join(process.cwd(), 'generated', 'assets');
const COURSEWARES_DIR = join(process.cwd(), 'generated', 'coursewares');

const exampleCourseware = {
  id: 'cw-example-server-001',
  version: '1.0',
  title: '后端示例课件',
  topicDescription: '用于验证后端 Schema 校验的示例课件',
  designSystem: {
    id: 'default',
    name: '默认教学风格',
    tokens: {
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        background: '#ffffff',
        text: '#1e293b',
      },
      fonts: {
        heading: 'sans-serif',
        body: 'sans-serif',
        mono: 'monospace',
      },
      fontSizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24 },
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
      borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    },
  },
  slides: [
    {
      id: 'slide-1',
      order: 0,
      title: '后端示例',
      layout: { templateId: 'title', variant: 'center', constraints: [] },
      background: { color: '#f8fafc' },
      elements: [
        {
          id: 'el-1',
          type: 'text',
          semanticRole: 'title',
          geometry: {
            x: 240,
            y: 300,
            width: 800,
            height: 100,
            zIndex: 1,
          },
          content: { text: '后端 Schema 校验通过' },
          style: { color: '#1e293b', fontSize: 48, textAlign: 'center' },
          animation: { entrance: [], exit: [] },
          interactions: [],
        },
      ],
      transition: { type: 'fade', duration: 0.5, easing: 'power2.out' },
      timeline: { autoPlay: true },
    },
  ],
  assets: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

@Injectable()
export class CoursewareService {
  private coursewares = new Map<string, Courseware>();

  constructor(private readonly assetsService: AssetsService) {
    this.loadAll();
    // Ensure the example courseware is always available.
    const result = CoursewareSchema.safeParse(exampleCourseware);
    if (result.success && !this.coursewares.has(result.data.id)) {
      this.coursewares.set(result.data.id, result.data);
      this.saveOne(result.data);
    }
  }

  private now() {
    return new Date().toISOString();
  }

  private ensureStorageDir() {
    if (!existsSync(COURSEWARES_DIR)) {
      mkdirSync(COURSEWARES_DIR, { recursive: true });
    }
  }

  private filePath(id: string) {
    return join(COURSEWARES_DIR, `${id}.json`);
  }

  private loadAll() {
    if (!existsSync(COURSEWARES_DIR)) return;
    const files = readdirSync(COURSEWARES_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = readFileSync(join(COURSEWARES_DIR, file), 'utf-8');
        const parsed = JSON.parse(raw);
        const result = CoursewareSchema.safeParse(parsed);
        if (result.success) {
          this.coursewares.set(result.data.id, result.data);
        }
      } catch {
        // Skip corrupted files silently.
      }
    }
  }

  private saveOne(courseware: Courseware) {
    this.ensureStorageDir();
    writeFileSync(this.filePath(courseware.id), JSON.stringify(courseware, null, 2), 'utf-8');
  }

  private deleteOne(id: string) {
    const path = this.filePath(id);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }

  validate(courseware: unknown) {
    return CoursewareSchema.safeParse(courseware);
  }

  findAll(): Courseware[] {
    return Array.from(this.coursewares.values());
  }

  findById(id: string): Courseware | undefined {
    return this.coursewares.get(id);
  }

  create(data: Omit<Courseware, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Courseware {
    const now = this.now();
    const courseware: Courseware = {
      ...data,
      id: data.id || `cw-${randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    } as Courseware;

    const result = this.validate(courseware);
    if (!result.success) {
      throw new Error(`Invalid courseware: ${result.error.message}`);
    }

    this.coursewares.set(result.data.id, result.data);
    this.saveOne(result.data);
    return result.data;
  }

  update(id: string, data: Partial<Courseware>): Courseware {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Courseware ${id} not found`);
    }

    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: this.now(),
    };

    const result = this.validate(updated);
    if (!result.success) {
      throw new Error(`Invalid courseware: ${result.error.message}`);
    }

    this.coursewares.set(id, result.data);
    this.saveOne(result.data);
    return result.data;
  }

  remove(id: string): { id: string } {
    if (!this.coursewares.has(id)) {
      throw new NotFoundException(`Courseware ${id} not found`);
    }
    this.coursewares.delete(id);
    this.deleteOne(id);
    return { id };
  }

  getExampleCourseware() {
    const result = CoursewareSchema.safeParse(exampleCourseware);
    return {
      valid: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error.message,
    };
  }

  async exportPackage(id: string): Promise<{ filename: string; buffer: Buffer }> {
    const courseware = this.findById(id);
    if (!courseware) {
      throw new NotFoundException(`Courseware ${id} not found`);
    }

    const zip = new JSZip();
    zip.file('courseware.json', JSON.stringify(courseware, null, 2));

    const assetsFolder = zip.folder('assets');
    if (assetsFolder) {
      for (const asset of courseware.assets || []) {
        const ext = extname(asset.filename) || '';
        const assetPath = join(ASSETS_DIR, `${asset.id}${ext}`);
        if (existsSync(assetPath)) {
          const buffer = readFileSync(assetPath);
          assetsFolder.file(`${asset.id}${ext}`, buffer);
        }
      }
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return {
      filename: `${courseware.title || courseware.id}.courseware.zip`,
      buffer,
    };
  }
}
