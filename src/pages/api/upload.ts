import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { mockTranscribe } from '../../../lib/mockTranscribe';

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'audio/flac',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      uploadDir: path.join(process.cwd(), 'public', 'uploads'),
      keepExtensions: true,
      filter: (part) => {
        if (!part.mimetype) {
          return false;
        }
        return ALLOWED_MIME_TYPES.includes(part.mimetype);
      },
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
        } else {
          resolve([fields, files]);
        }
      });
    });

    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const uploadedFile = Array.isArray(file) ? file[0] : file;

    if (!uploadedFile.filepath) {
      return res.status(400).json({ error: 'File upload failed: no file path' });
    }

    const stats = fs.statSync(uploadedFile.filepath);
    if (stats.size === 0) {
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    if (!uploadedFile.mimetype || !ALLOWED_MIME_TYPES.includes(uploadedFile.mimetype)) {
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(415).json({ error: 'Unsupported file format. Supported formats: MP3, WAV, OGG, WebM, MP4, M4A, FLAC' });
    }

    const transcriptText = mockTranscribe(uploadedFile.originalFilename || 'unknown');

    const transcript = await prisma.transcript.create({
      data: {
        filename: uploadedFile.originalFilename || 'unknown',
        text: transcriptText,
      },
    });

    return res.status(200).json({
      id: transcript.id,
      text: transcript.text,
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 50 MB.' });
    }

    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return res.status(500).json({ error: 'File storage error. Please try again later.' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}