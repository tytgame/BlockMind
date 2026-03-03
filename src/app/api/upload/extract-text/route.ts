import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';
import mammoth from 'mammoth';

const MAX_TEXT_LENGTH = 8000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { storagePath, fileName } = (await req.json()) as {
    storagePath?: string;
    fileName?: string;
  };

  if (!storagePath || !fileName) {
    return NextResponse.json({ error: 'storagePath, fileName required' }, { status: 400 });
  }

  if (!storagePath.startsWith(`${session.user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: urlData, error: urlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 300);

  if (urlError || !urlData) {
    return NextResponse.json({ error: 'Failed to get file from storage' }, { status: 500 });
  }

  const fileResponse = await fetch(urlData.signedUrl);
  if (!fileResponse.ok) {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }

  const fileBuffer = await fileResponse.arrayBuffer();

  const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
  const text = result.value.slice(0, MAX_TEXT_LENGTH);

  return NextResponse.json({ text });
}
