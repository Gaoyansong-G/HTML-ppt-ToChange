import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursewareSchema, type Courseware } from '@courseware/shared';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import { extname, join } from 'path';
import { existsSync, readFileSync, readdirSync, renameSync } from 'fs';
import { AssetsService } from '../assets/assets.service';
import { DatabaseService } from '../persistence/database.service';

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
  private readonly logger = new Logger(CoursewareService.name);
  private coursewares = new Map<string, Courseware>();

  constructor(
    private readonly assetsService: AssetsService,
    private readonly databaseService: DatabaseService,
  ) {
    this.migrateLegacyFiles();
    this.loadAll();
    // Ensure the example courseware is always available.
    const result = CoursewareSchema.safeParse(exampleCourseware);
    if (result.success && !this.coursewares.has(result.data.id)) {
      const courseware = { ...result.data, revision: 1 };
      this.coursewares.set(courseware.id, courseware);
      this.saveOne(courseware);
    }
  }

  private now() {
    return new Date().toISOString();
  }

  /**
   * One-shot import of legacy JSON files from generated/coursewares/.
   * Successfully imported files are renamed to *.json.migrated so the
   * import never runs twice.
   */
  private migrateLegacyFiles() {
    if (!existsSync(COURSEWARES_DIR)) return;
    const files = readdirSync(COURSEWARES_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const fullPath = join(COURSEWARES_DIR, file);
      try {
        const raw = readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const result = CoursewareSchema.safeParse(parsed);
        if (result.success) {
          this.persist(result.data);
          renameSync(fullPath, `${fullPath}.migrated`);
        } else {
          this.logger.warn(`Skipping legacy courseware ${file}: schema validation failed`);
        }
      } catch (err) {
        this.logger.warn(`Skipping legacy courseware ${file}: ${(err as Error).message}`);
      }
    }
  }

  private persist(courseware: Courseware) {
    this.databaseService.upsertCourseware({
      id: courseware.id,
      title: courseware.title ?? '',
      data: JSON.stringify(courseware),
      createdAt: courseware.createdAt ?? this.now(),
      updatedAt: courseware.updatedAt ?? this.now(),
    });
  }

  private loadAll() {
    for (const row of this.databaseService.listCoursewares()) {
      try {
        const parsed = JSON.parse(row.data);
        const result = CoursewareSchema.safeParse(parsed);
        if (result.success) {
          const courseware = {
            ...result.data,
            revision: result.data.revision ?? 1,
          };
          this.coursewares.set(courseware.id, courseware);
          // Transparently add a revision to legacy documents without changing
          // their content, id, or timestamps.
          if (result.data.revision == null) {
            this.saveOne(courseware);
          }
        }
      } catch {
        // Skip corrupted rows silently.
      }
    }
  }

  private saveOne(courseware: Courseware) {
    this.persist(courseware);
  }

  private deleteOne(id: string) {
    this.databaseService.deleteCourseware(id);
  }

  validate(courseware: unknown) {
    return CoursewareSchema.safeParse(courseware);
  }

  findAll(): Courseware[] {
    return Array.from(this.coursewares.values());
  }

  findSummaries() {
    return Array.from(this.coursewares.values())
      .map((courseware) => ({
        id: courseware.id,
        title: courseware.title,
        topicDescription: courseware.topicDescription,
        subject: courseware.subject,
        gradeLevel: courseware.gradeLevel,
        slideCount: courseware.slides.length,
        createdAt: courseware.createdAt,
        updatedAt: courseware.updatedAt,
        revision: courseware.revision ?? 1,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  findById(id: string): Courseware | undefined {
    return this.coursewares.get(id);
  }

  create(data: Omit<Courseware, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Courseware {
    const now = this.now();
    const id = data.id || `cw-${randomUUID()}`;
    if (this.coursewares.has(id)) {
      throw new ConflictException({
        message: `Courseware ${id} already exists`,
        code: 'COURSEWARE_ALREADY_EXISTS',
      });
    }
    const courseware: Courseware = {
      ...data,
      id,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    } as Courseware;

    const result = this.validate(courseware);
    if (!result.success) {
      throw new BadRequestException(`Invalid courseware: ${result.error.message}`);
    }

    this.coursewares.set(result.data.id, result.data);
    this.saveOne(result.data);
    return result.data;
  }

  update(id: string, data: Partial<Courseware>, expectedRevision?: number): Courseware {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Courseware ${id} not found`);
    }

    const currentRevision = existing.revision ?? 1;
    const requestedRevision = expectedRevision ?? data.revision;
    if (requestedRevision != null && requestedRevision !== currentRevision) {
      throw new ConflictException({
        message: '课件已在另一个窗口中更新',
        code: 'COURSEWARE_REVISION_CONFLICT',
        expectedRevision: requestedRevision,
        currentRevision,
        updatedAt: existing.updatedAt,
      });
    }

    const updated = {
      ...existing,
      ...data,
      id,
      revision: currentRevision + 1,
      createdAt: existing.createdAt,
      updatedAt: this.now(),
    };

    const result = this.validate(updated);
    if (!result.success) {
      throw new BadRequestException(`Invalid courseware: ${result.error.message}`);
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
    const missingAssets: string[] = [];
    if (assetsFolder) {
      for (const asset of courseware.assets || []) {
        // Data URLs are already self-contained in courseware.json. Every other
        // URL must resolve to durable server storage; otherwise the package
        // would depend on a browser session or an external service.
        if (asset.url.startsWith('data:')) continue;
        if (!asset.url.includes('/api/assets/')) {
          missingAssets.push(asset.filename || asset.id);
          continue;
        }

        const stored = this.assetsService.findStoredFileById(asset.id);
        if (!stored) {
          missingAssets.push(asset.filename || asset.id);
          continue;
        }

        const ext = extname(asset.filename) || '';
        assetsFolder.file(`${asset.id}${ext}`, readFileSync(stored.filepath));
      }
    }

    if (missingAssets.length > 0) {
      throw new UnprocessableEntityException({
        message: `以下素材文件缺失，无法导出完整课件包：${missingAssets.slice(0, 8).join('、')}${
          missingAssets.length > 8 ? ` 等 ${missingAssets.length} 项` : ''
        }`,
        code: 'COURSEWARE_ASSET_MISSING',
        missingAssets,
      });
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return {
      filename: `${courseware.title || courseware.id}.courseware.zip`,
      buffer,
    };
  }
}
