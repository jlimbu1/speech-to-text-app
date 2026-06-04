import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { id, format } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid transcript ID' });
  }

  if (!format || (format !== 'txt' && format !== 'json')) {
    return res.status(400).json({ error: 'Format must be "txt" or "json"' });
  }

  try {
    const transcript = await prisma.transcript.findUnique({
      where: { id },
    });

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const filename = transcript.filename
      ? transcript.filename.replace(/\.[^/.]+$/, '')
      : 'transcript';

    if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
      return res.status(200).send(transcript.text);
    }

    if (format === 'json') {
      const jsonContent = JSON.stringify(
        {
          id: transcript.id,
          filename: transcript.filename,
          text: transcript.text,
          createdAt: transcript.createdAt,
        },
        null,
        2
      );
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.status(200).send(jsonContent);
    }
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}