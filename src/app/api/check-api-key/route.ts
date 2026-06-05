import { NextResponse } from 'next/server';
import { hasApiKey } from '@/lib/transcription';

export async function GET() {
  return NextResponse.json({
    configured: hasApiKey(),
  });
}
