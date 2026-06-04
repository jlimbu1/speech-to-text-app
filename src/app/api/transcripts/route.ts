import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const transcripts = await prisma.transcript.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(transcripts);
  } catch (error) {
    console.error('List transcripts error:', error);
    return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 500 });
  }
}
