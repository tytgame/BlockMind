import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';

// GET /api/blocks — 내 블록 목록 (order 오름차순)
// image/file 타입 블록은 signedUrl(1h) 포함
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blocks = await prisma.block.findMany({
    where: { userId: session.user.id },
    orderBy: { order: 'asc' },
  });

  // 파일이 있는 블록에 signedUrl 주입
  const fileBlocks = blocks.filter((b) => b.fileUrl);
  if (fileBlocks.length === 0) {
    return NextResponse.json(blocks);
  }

  const supabase = createAdminClient();
  const withSignedUrls = await Promise.all(
    blocks.map(async (block) => {
      if (!block.fileUrl) return block;
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(block.fileUrl, 3600);
      return { ...block, signedUrl: data?.signedUrl ?? null };
    })
  );

  return NextResponse.json(withSignedUrls);
}

// POST /api/blocks — 블록 생성
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    type: string;
    label: string;
    content: string;
    color: string;
    order: number;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    geminiFileUri?: string;
    geminiExpiresAt?: string | null;
    sourceSessionId?: string;
  };

  const block = await prisma.block.create({
    data: {
      userId: session.user.id,
      type: body.type,
      label: body.label,
      content: body.content,
      color: body.color,
      order: body.order,
      fileUrl: body.fileUrl ?? null,
      fileName: body.fileName ?? null,
      fileType: body.fileType ?? null,
      fileSize: body.fileSize ?? null,
      geminiFileUri: body.geminiFileUri ?? null,
      geminiExpiresAt: body.geminiExpiresAt ? new Date(body.geminiExpiresAt) : null,
      sourceSessionId: body.sourceSessionId ?? null,
    },
  });

  // image/file 타입 블록은 signedUrl 즉시 생성 (appendBlock 후 썸네일/미리보기 표시용)
  if (block.fileUrl) {
    const supabase = createAdminClient();
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(block.fileUrl, 3600);
    return NextResponse.json({ ...block, signedUrl: data?.signedUrl ?? null }, { status: 201 });
  }

  return NextResponse.json(block, { status: 201 });
}
