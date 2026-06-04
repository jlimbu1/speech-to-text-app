import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || '';

    const where = search
      ? { text: { contains: search } }
      : {};

    const transcripts = await prisma.transcript.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(transcripts, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch transcripts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}