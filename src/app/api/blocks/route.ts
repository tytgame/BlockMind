import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';

const createBlockSchema = z.object({
  type: z.enum(['data', 'image', 'file']),
  label: z.string().min(1).max(200),
  content: z.string().min(1).max(10_000),
  order: z.number().int().min(0),
  fileUrl: z.string().max(500).optional(),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
  geminiFileUri: z.string().max(500).optional(),
  geminiExpiresAt: z.string().nullable().optional(),
  sourceSessionId: z.string().max(100).optional(),
  sourceMessageId: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
});

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
    include: { sourceSession: { select: { title: true } } },
  });

  // sourceSessionTitle을 flat하게 주입, sourceSession 관계 제거
  const flatBlocks = blocks.map(({ sourceSession, ...b }) => ({
    ...b,
    sourceSessionTitle: sourceSession?.title ?? null,
  }));

  // 파일이 있는 블록에 signedUrl 주입 — 5개씩 청크로 처리 (동시 호출 제한 + 단일 실패 격리)
  const CONCURRENCY = 5;
  const fileIndices = flatBlocks.reduce<number[]>((acc, b, i) => {
    if (b.fileUrl) acc.push(i);
    return acc;
  }, []);

  if (fileIndices.length === 0) {
    return NextResponse.json(flatBlocks);
  }

  const supabase = createAdminClient();
  const withSignedUrls = flatBlocks.map((b) => ({ ...b, signedUrl: null as string | null }));

  for (let i = 0; i < fileIndices.length; i += CONCURRENCY) {
    const chunk = fileIndices.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      chunk.map(async (idx) => {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(flatBlocks[idx].fileUrl!, 3600);
        withSignedUrls[idx].signedUrl = data?.signedUrl ?? null;
      })
    );
  }

  return NextResponse.json(withSignedUrls);
}

// POST /api/blocks — 블록 생성
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = createBlockSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const body = parsed.data;

  // sourceSessionId가 있으면 해당 세션의 소유자 확인
  if (body.sourceSessionId) {
    const ownerCheck = await prisma.chatSession.findUnique({
      where: { id: body.sourceSessionId },
      select: { userId: true },
    });
    if (ownerCheck?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const block = await prisma.block.create({
    data: {
      userId: session.user.id,
      type: body.type,
      label: body.label,
      content: body.content,
      order: body.order,
      fileUrl: body.fileUrl ?? null,
      fileName: body.fileName ?? null,
      fileType: body.fileType ?? null,
      fileSize: body.fileSize ?? null,
      geminiFileUri: body.geminiFileUri ?? null,
      geminiExpiresAt: body.geminiExpiresAt ? new Date(body.geminiExpiresAt) : null,
      sourceSessionId: body.sourceSessionId ?? null,
      sourceMessageId: body.sourceMessageId ?? null,
      category: body.category ?? null,
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
