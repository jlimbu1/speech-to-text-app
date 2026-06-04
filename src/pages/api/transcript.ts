import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid transcript ID' });
    }

    const transcript = await prisma.transcript.findUnique({
      where: { id },
    });

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const format = req.query.format;
    if (format === 'json') {
      return res.status(200).json(transcript);
    }

    return res.status(200).json(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}