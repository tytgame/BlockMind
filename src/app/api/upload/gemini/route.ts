import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { storagePath, mimeType, fileName } = (await req.json()) as {
    storagePath?: string;
    mimeType?: string;
    fileName?: string;
  };

  if (!storagePath || !mimeType || !fileName) {
    return NextResponse.json({ error: 'storagePath, mimeType, fileName required' }, { status: 400 });
  }

  // 본인 파일만 접근 가능
  if (!storagePath.startsWith(`${session.user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Supabase에서 signed URL 생성 후 파일 fetch
  const { data: urlData, error: urlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 300); // 5분 (다운로드용)

  if (urlError || !urlData) {
    return NextResponse.json({ error: 'Failed to get file from storage' }, { status: 500 });
  }

  const fileResponse = await fetch(urlData.signedUrl);
  if (!fileResponse.ok) {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }

  const fileBuffer = await fileResponse.arrayBuffer();
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  // Gemini Files API에 업로드 (resumable upload)
  // 1단계: 업로드 세션 시작
  const initResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileBuffer.byteLength),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: fileName } }),
    }
  );

  if (!initResponse.ok) {
    const err = await initResponse.text();
    console.error('[upload/gemini] Init error:', err);
    return NextResponse.json({ error: 'Failed to init Gemini upload' }, { status: 500 });
  }

  const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    return NextResponse.json({ error: 'No upload URL from Gemini' }, { status: 500 });
  }

  // 2단계: 파일 데이터 업로드
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': mimeType,
    },
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const err = await uploadResponse.text();
    console.error('[upload/gemini] Upload error:', err);
    return NextResponse.json({ error: 'Failed to upload to Gemini' }, { status: 500 });
  }

  const uploadResult = (await uploadResponse.json()) as {
    file?: { uri?: string; expirationTime?: string };
  };

  const geminiFileUri = uploadResult.file?.uri;
  const expirationTime = uploadResult.file?.expirationTime;

  if (!geminiFileUri) {
    return NextResponse.json({ error: 'No file URI from Gemini' }, { status: 500 });
  }

  return NextResponse.json({
    geminiFileUri,
    geminiExpiresAt: expirationTime ?? null,
  });
}
