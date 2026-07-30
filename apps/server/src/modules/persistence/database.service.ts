import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'courseware.db');

export interface CoursewareRow {
  id: string;
  title: string | null;
  data: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  filename: string | null;
  mime_type: string | null;
  size: number | null;
  extracted_text: string | null;
  structure: string | null;
  path: string | null;
  created_at: string;
}

export interface UsageLogRow {
  id: number;
  ts: string;
  endpoint: string | null;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  caller: string | null;
}

export interface UsageSummary {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  calls: number;
}

export interface ModelUsageSummary extends UsageSummary {
  model: string;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly db: Database.Database;

  constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
    this.logger.log(`SQLite database opened at ${DB_PATH}`);
  }

  onModuleDestroy() {
    this.db.close();
  }

  get raw(): Database.Database {
    return this.db;
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS coursewares (
        id TEXT PRIMARY KEY,
        title TEXT,
        data TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT,
        mime_type TEXT,
        size INTEGER,
        extracted_text TEXT,
        structure TEXT,
        path TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT,
        endpoint TEXT,
        model TEXT,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        cached_tokens INTEGER,
        caller TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_usage_logs_ts ON usage_logs (ts);
    `);
  }

  // ---------- coursewares ----------

  upsertCourseware(row: {
    id: string;
    title: string;
    data: string;
    createdAt: string;
    updatedAt: string;
  }) {
    this.db
      .prepare(
        `INSERT INTO coursewares (id, title, data, created_at, updated_at)
         VALUES (@id, @title, @data, @createdAt, @updatedAt)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           data = excluded.data,
           updated_at = excluded.updated_at`,
      )
      .run(row);
  }

  getCourseware(id: string): CoursewareRow | undefined {
    return this.db.prepare('SELECT * FROM coursewares WHERE id = ?').get(id) as
      | CoursewareRow
      | undefined;
  }

  listCoursewares(): CoursewareRow[] {
    return this.db
      .prepare('SELECT * FROM coursewares ORDER BY created_at ASC')
      .all() as CoursewareRow[];
  }

  deleteCourseware(id: string) {
    this.db.prepare('DELETE FROM coursewares WHERE id = ?').run(id);
  }

  // ---------- documents ----------

  insertDocument(row: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    extractedText: string;
    structure: string;
    path: string;
    createdAt: string;
  }) {
    this.db
      .prepare(
        `INSERT INTO documents (id, filename, mime_type, size, extracted_text, structure, path, created_at)
         VALUES (@id, @filename, @mimeType, @size, @extractedText, @structure, @path, @createdAt)
         ON CONFLICT(id) DO UPDATE SET
           filename = excluded.filename,
           mime_type = excluded.mime_type,
           size = excluded.size,
           extracted_text = excluded.extracted_text,
           structure = excluded.structure,
           path = excluded.path`,
      )
      .run(row);
  }

  getDocument(id: string): DocumentRow | undefined {
    return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as
      | DocumentRow
      | undefined;
  }

  // ---------- usage logs ----------

  insertUsageLog(entry: {
    ts: string;
    endpoint: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    caller: string;
  }) {
    this.db
      .prepare(
        `INSERT INTO usage_logs (ts, endpoint, model, prompt_tokens, completion_tokens, cached_tokens, caller)
         VALUES (@ts, @endpoint, @model, @promptTokens, @completionTokens, @cachedTokens, @caller)`,
      )
      .run(entry);
  }

  /**
   * Aggregate usage. `sinceIso` (inclusive) limits to rows at/after that
   * timestamp; omit it for all-time totals.
   */
  summarizeUsage(sinceIso?: string): UsageSummary {
    const row = (
      sinceIso
        ? this.db
            .prepare(
              `SELECT COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
                      COALESCE(SUM(completion_tokens), 0) AS completionTokens,
                      COALESCE(SUM(cached_tokens), 0) AS cachedTokens,
                      COUNT(*) AS calls
               FROM usage_logs WHERE ts >= ?`,
            )
            .get(sinceIso)
        : this.db
            .prepare(
              `SELECT COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
                      COALESCE(SUM(completion_tokens), 0) AS completionTokens,
                      COALESCE(SUM(cached_tokens), 0) AS cachedTokens,
                      COUNT(*) AS calls
               FROM usage_logs`,
            )
            .get()
    ) as UsageSummary;
    return row;
  }

  /**
   * Aggregate usage grouped by model (endpoint id). `sinceIso` (inclusive)
   * limits to rows at/after that timestamp; omit it for all-time totals.
   */
  summarizeUsageByModel(sinceIso?: string): ModelUsageSummary[] {
    const select = `
      SELECT COALESCE(model, 'unknown') AS model,
             COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
             COALESCE(SUM(completion_tokens), 0) AS completionTokens,
             COALESCE(SUM(cached_tokens), 0) AS cachedTokens,
             COUNT(*) AS calls
      FROM usage_logs`;
    const groupOrder = `
      GROUP BY model
      ORDER BY (promptTokens + completionTokens) DESC`;
    return (
      sinceIso
        ? this.db.prepare(`${select} WHERE ts >= ?${groupOrder}`).all(sinceIso)
        : this.db.prepare(`${select}${groupOrder}`).all()
    ) as ModelUsageSummary[];
  }
}
