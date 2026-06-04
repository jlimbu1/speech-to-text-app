import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transcript = await prisma.transcript.findUnique({ where: { id } });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    return NextResponse.json(transcript);
  } catch (error) {
    console.error('Get transcript error:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { text } = await request.json();

    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'text field is required' }, { status: 400 });
    }

    const transcript = await prisma.transcript.update({
      where: { id },
      data: { text },
    });

    return NextResponse.json(transcript);
  } catch (error) {
    console.error('Update transcript error:', error);
    return NextResponse.json({ error: 'Failed to update transcript' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.transcript.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete transcript error:', error);
    return NextResponse.json({ error: 'Failed to delete transcript' }, { status: 500 });
  }
}
