import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';

// 허용된 MIME 타입
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fileName, mimeType } = (await req.json()) as {
    fileName?: string;
    mimeType?: string;
  };

  if (!fileName || !mimeType) {
    return NextResponse.json({ error: 'fileName, mimeType required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  // 파일 경로: userId/timestamp-originalName
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${session.user.id}/${timestamp}-${safeName}`;

  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error('[upload-url] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    storagePath,
    token: data.token,
  });
}
