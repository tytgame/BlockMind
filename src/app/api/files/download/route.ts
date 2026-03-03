import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  // 본인 파일만 접근 가능 (경로가 userId/로 시작해야 함)
  if (!path.startsWith(`${session.user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600); // 1시간 유효

  if (error || !data) {
    console.error('[download] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to create download URL' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
