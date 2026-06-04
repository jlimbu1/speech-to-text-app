import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, text } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid id' });
  }

  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text' });
  }

  try {
    const updated = await prisma.transcript.update({
      where: { id },
      data: { text },
    });

    return res.status(200).json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    console.error('Failed to update transcript:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}