import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const language = searchParams.get('language')?.trim() || '';

    const where: Record<string, unknown> = {};

    if (query) {
      where.OR = [
        { text: { contains: query } },
        { originalName: { contains: query } },
        { filename: { contains: query } },
      ];
    }

    if (language) {
      where.language = language;
    }

    const transcripts = await prisma.transcript.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(transcripts);
  } catch (error) {
    console.error('List transcripts error:', error);
    return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 500 });
  }
}
