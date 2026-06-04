import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, format } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid transcript ID' });
    }

    const transcript = await prisma.transcript.findUnique({
      where: { id },
    });

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="transcript-${id}.json"`);
      return res.status(200).json(transcript);
    }

    if (format === 'txt' || !format) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="transcript-${id}.txt"`);
      return res.status(200).send(transcript.text);
    }

    return res.status(400).json({ error: 'Unsupported export format. Use "txt" or "json".' });
  } catch (error) {
    console.error('Error exporting transcript:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}