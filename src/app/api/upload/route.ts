import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a', 'audio/ogg', 'audio/mp3'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|mp4)$/i)) {
      return NextResponse.json({ error: 'Unsupported file format. Please upload MP3, WAV, M4A, or WebM audio.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 50 MB size limit.' }, { status: 413 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const uuid = crypto.randomUUID();
    const storedFilename = `${uuid}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, storedFilename), buffer);

    return NextResponse.json({
      fileId: uuid,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
