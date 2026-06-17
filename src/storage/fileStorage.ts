import fs from 'fs/promises';
import path from 'path';

let uploadsDir: string;

export async function ensureUploadsDir(dir: string): Promise<void> {
  uploadsDir = dir;
  await fs.mkdir(dir, { recursive: true });
}

export async function saveAudioFile(filename: string, buffer: Buffer): Promise<string> {
  if (!uploadsDir) {
    throw new Error('Uploads directory not initialized. Call ensureUploadsDir first.');
  }
  const filePath = path.join(uploadsDir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function getAudioFile(filename: string): Promise<Buffer> {
  if (!uploadsDir) {
    throw new Error('Uploads directory not initialized. Call ensureUploadsDir first.');
  }
  const filePath = path.join(uploadsDir, filename);
  return fs.readFile(filePath);
}

export async function deleteAudioFile(filename: string): Promise<void> {
  if (!uploadsDir) {
    throw new Error('Uploads directory not initialized. Call ensureUploadsDir first.');
  }
  const filePath = path.join(uploadsDir, filename);
  await fs.unlink(filePath);
}

export async function fileExists(filename: string): Promise<boolean> {
  if (!uploadsDir) {
    throw new Error('Uploads directory not initialized. Call ensureUploadsDir first.');
  }
  const filePath = path.join(uploadsDir, filename);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}