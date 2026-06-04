import type { NextApiRequest, NextApiResponse } from 'next';
import { createReadStream, unlink } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import busboy from 'busboy';
import prisma from '../../lib/prisma';
import mockTranscribe from '../../lib/mockTranscribe';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_FILE_SIZE) {
      return res.status(413).json({ error: 'File exceeds maximum size of 50MB' });
    }

    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
      },
    });

    let fileSaved = false;
    let savedFilePath: string = '';
    let originalFilename: string = '';

    const filePromise = new Promise<{ filePath: string; filename: string }>(
      (resolve, reject) => {
        bb.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
          const { filename, mimeType } = info;

          if (!filename) {
            return reject(new Error('No file provided'));
          }

          // Validate mime type is an audio file
          const allowedMimeTypes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/ogg',
            'audio/webm',
            'audio/x-m4a',
            'audio/mp4',
          ];
          if (!allowedMimeTypes.includes(mimeType)) {
            return reject(new Error('Unsupported file format. Please upload an audio file.'));
          }

          const uniqueFilename = `${Date.now()}-${filename}`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          const filePath = path.join(uploadDir, uniqueFilename);

          const writeStream = require('fs').createWriteStream(filePath);

          file.on('limit', () => {
            reject(new Error('File exceeds maximum size of 50MB'));
          });

          file.pipe(writeStream);

          writeStream.on('finish', () => {
            fileSaved = true;
            savedFilePath = filePath;
            originalFilename = filename;
            resolve({ filePath, filename: uniqueFilename });
          });

          writeStream.on('error', (err: Error) => {
            reject(err);
          });
        });

        bb.on('error', (err: Error) => {
          reject(err);
        });

        req.pipe(bb);
      }
    );

    const { filePath, filename } = await filePromise;

    // Run mock transcription
    const transcriptText = await mockTranscribe(filePath);

    // Store in database
    const transcript = await prisma.transcript.create({
      data: {
        filename: originalFilename,
        text: transcriptText,
      },
    });

    // Clean up the uploaded file after processing
    try {
      await unlink(filePath, () => {});
    } catch {
      // File cleanup failure is non-critical
    }

    return res.status(200).json({
      id: transcript.id,
      text: transcript.text,
    });
  } catch (error: unknown) {
    // Clean up file if it was saved but an error occurred later
    if (savedFilePath) {
      try {
        await unlink(savedFilePath, () => {});
      } catch {
        // ignore cleanup errors
      }
    }

    if (error instanceof Error) {
      if (error.message === 'No file provided') {
        return res.status(400).json({ error: 'No file provided' });
      }
      if (error.message === 'Unsupported file format. Please upload an audio file.') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'File exceeds maximum size of 50MB') {
        return res.status(413).json({ error: error.message });
      }
    }

    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}