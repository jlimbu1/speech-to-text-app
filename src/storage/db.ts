import Database from 'better-sqlite3';
import path from 'path';
import { Job, CreateJobInput, UpdateJobInput } from '../types';

let db: Database.Database;

export function initDatabase(): void {
  const dbPath = path.resolve(__dirname, '..', '..', 'data', 'speech-to-text.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'done', 'error')),
      original_filename TEXT NOT NULL,
      transcription TEXT,
      created_at TEXT NOT NULL
    )
  `);
}

export function createJob(input: CreateJobInput): Job {
  const { id, originalFilename } = input;
  const createdAt = new Date().toISOString();
  const status = 'pending';

  const stmt = db.prepare(
    'INSERT INTO jobs (id, status, original_filename, transcription, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(id, status, originalFilename, null, createdAt);

  return {
    id,
    status,
    originalFilename,
    transcription: null,
    createdAt,
  };
}

export function getJobById(id: string): Job | null {
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id as string,
    status: row.status as Job['status'],
    originalFilename: row.original_filename as string,
    transcription: row.transcription as string | null,
    createdAt: row.created_at as string,
  };
}

export function updateJob(id: string, input: UpdateJobInput): Job | null {
  const existing = getJobById(id);
  if (!existing) {
    return null;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.status !== undefined) {
    fields.push('status = ?');
    values.push(input.status);
  }

  if (input.transcription !== undefined) {
    fields.push('transcription = ?');
    values.push(input.transcription);
  }

  if (fields.length === 0) {
    return existing;
  }

  values.push(id);
  const stmt = db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getJobById(id);
}

export function getAllJobs(): Job[] {
  const stmt = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC');
  const rows = stmt.all() as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    status: row.status as Job['status'],
    originalFilename: row.original_filename as string,
    transcription: row.transcription as string | null,
    createdAt: row.created_at as string,
  }));
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}