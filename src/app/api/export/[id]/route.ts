import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTxt, generateSrt } from '@/lib/export';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transcript = await prisma.transcript.findUnique({ where: { id } });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'txt';

    if (format === 'txt') {
      const content = generateTxt(transcript.text);
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${transcript.originalName.replace(/\.[^.]+$/, '')}.txt"`,
        },
      });
    }

    if (format === 'srt') {
      const content = generateSrt(transcript.text);
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/x-subrip; charset=utf-8',
          'Content-Disposition': `attachment; filename="${transcript.originalName.replace(/\.[^.]+$/, '')}.srt"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format. Use "txt" or "srt".' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
