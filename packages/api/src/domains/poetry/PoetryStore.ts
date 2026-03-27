import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { SEEDED_POEMS } from './seed-poems.js';

export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  annotation: string | null;
  appreciation: string | null;
  sourceVersion: string;
  sourceUrl: string;
  dataChecksum: string;
  ingestedAt: number;
  licenseTag: string;
}

export interface PoetrySuggestion {
  id: string;
  userId: string;
  poemId: string;
  suggestionText: string;
  createdAt: number;
  status: string;
}

interface DbPoemRow {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  annotation: string | null;
  appreciation: string | null;
  source_version: string;
  source_url: string;
  data_checksum: string;
  ingested_at: number;
  license_tag: string;
}

export class PoetryStore {
  constructor(private readonly db: Database.Database) {
    this.initSchema();
    this.seedDefaults();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS poems (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        dynasty TEXT NOT NULL,
        content TEXT NOT NULL,
        annotation TEXT,
        appreciation TEXT,
        source_version TEXT NOT NULL,
        source_url TEXT NOT NULL,
        data_checksum TEXT NOT NULL,
        ingested_at INTEGER NOT NULL,
        license_tag TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_favorites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        poem_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(user_id, poem_id),
        FOREIGN KEY(poem_id) REFERENCES poems(id)
      );

      CREATE TABLE IF NOT EXISTS user_suggestions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        poem_id TEXT NOT NULL,
        suggestion_text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY(poem_id) REFERENCES poems(id)
      );

      CREATE INDEX IF NOT EXISTS idx_poetry_favorites_user_poem
        ON user_favorites(user_id, poem_id);

      CREATE INDEX IF NOT EXISTS idx_poetry_suggestions_poem
        ON user_suggestions(poem_id);
    `);
  }

  private seedDefaults(): void {
    const existing = this.db.prepare('SELECT COUNT(*) AS count FROM poems').get() as { count: number };
    if (existing.count > 0) return;

    const now = Date.now();
    const insert = this.db.prepare(`
      INSERT INTO poems (
        id, title, author, dynasty, content, annotation, appreciation,
        source_version, source_url, data_checksum, ingested_at, license_tag
      ) VALUES (
        @id, @title, @author, @dynasty, @content, @annotation, @appreciation,
        @source_version, @source_url, @data_checksum, @ingested_at, @license_tag
      )
    `);

    const transaction = this.db.transaction(() => {
      for (const poem of SEEDED_POEMS) {
        insert.run({
          id: poem.id,
          title: poem.title,
          author: poem.author,
          dynasty: poem.dynasty,
          content: poem.content,
          annotation: poem.annotation,
          appreciation: poem.appreciation,
          source_version: poem.sourceVersion,
          source_url: poem.sourceUrl,
          data_checksum: poem.dataChecksum,
          ingested_at: now,
          license_tag: poem.licenseTag,
        });
      }
    });

    transaction();
  }

  async getTodayPoem(): Promise<Poem | null> {
    const count = this.getPoemCount();
    if (count === 0) return null;
    const today = this.getShanghaiDateKey();
    const offset = this.hashString(today) % count;
    return this.getPoemByOffset(offset);
  }

  async getNextPoem(userId: string, currentPoemId?: string | null): Promise<Poem | null> {
    const ids = this.listPoemIds();
    if (ids.length === 0) return null;
    if (ids.length === 1) return this.getPoemById(ids[0]);

    const currentIndex = currentPoemId ? ids.indexOf(currentPoemId) : -1;
    const baseKey = `${userId}:${Date.now()}`;
    const step = (this.hashString(baseKey) % (ids.length - 1)) + 1;
    const nextIndex = currentIndex >= 0 ? (currentIndex + step) % ids.length : this.hashString(baseKey) % ids.length;
    return this.getPoemById(ids[nextIndex]);
  }

  async getPoemById(poemId: string): Promise<Poem | null> {
    const row = this.db.prepare('SELECT * FROM poems WHERE id = ?').get(poemId) as DbPoemRow | undefined;
    return row ? this.toPoem(row) : null;
  }

  async setFavorite(userId: string, poemId: string, favorited: boolean): Promise<boolean> {
    if (!this.hasPoem(poemId)) return false;

    if (favorited) {
      const now = Date.now();
      this.db
        .prepare(
          `
            INSERT INTO user_favorites (id, user_id, poem_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, poem_id)
            DO UPDATE SET updated_at = excluded.updated_at
          `,
        )
        .run(randomUUID(), userId, poemId, now, now);
      return true;
    }

    this.db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND poem_id = ?').run(userId, poemId);
    return true;
  }

  async isFavorite(userId: string, poemId: string): Promise<boolean> {
    return (await this.getUserFavoriteCount(userId, poemId)) > 0;
  }

  async getUserFavoriteCount(userId: string, poemId: string): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM user_favorites WHERE user_id = ? AND poem_id = ?')
      .get(userId, poemId) as { count: number };
    return row.count;
  }

  async addSuggestion(userId: string, poemId: string, suggestionText: string): Promise<PoetrySuggestion | null> {
    if (!this.hasPoem(poemId)) return null;

    const createdAt = Date.now();
    const suggestion: PoetrySuggestion = {
      id: randomUUID(),
      userId,
      poemId,
      suggestionText,
      createdAt,
      status: 'pending',
    };

    this.db
      .prepare(
        `
          INSERT INTO user_suggestions (id, user_id, poem_id, suggestion_text, created_at, status)
          VALUES (@id, @user_id, @poem_id, @suggestion_text, @created_at, @status)
        `,
      )
      .run({
        id: suggestion.id,
        user_id: suggestion.userId,
        poem_id: suggestion.poemId,
        suggestion_text: suggestion.suggestionText,
        created_at: suggestion.createdAt,
        status: suggestion.status,
      });

    return suggestion;
  }

  async getSuggestionCount(poemId: string): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM user_suggestions WHERE poem_id = ?')
      .get(poemId) as { count: number };
    return row.count;
  }

  private hasPoem(poemId: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM poems WHERE id = ?').get(poemId) as { 1: number } | undefined;
    return Boolean(row);
  }

  private getPoemCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM poems').get() as { count: number };
    return row.count;
  }

  private getPoemByOffset(offset: number): Poem | null {
    const row = this.db
      .prepare('SELECT * FROM poems ORDER BY id LIMIT 1 OFFSET ?')
      .get(offset) as DbPoemRow | undefined;
    return row ? this.toPoem(row) : null;
  }

  private listPoemIds(): string[] {
    const rows = this.db.prepare('SELECT id FROM poems ORDER BY id').all() as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  private getShanghaiDateKey(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private toPoem(row: DbPoemRow): Poem {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      dynasty: row.dynasty,
      content: row.content,
      annotation: row.annotation,
      appreciation: row.appreciation,
      sourceVersion: row.source_version,
      sourceUrl: row.source_url,
      dataChecksum: row.data_checksum,
      ingestedAt: row.ingested_at,
      licenseTag: row.license_tag,
    };
  }
}
