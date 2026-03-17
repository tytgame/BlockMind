import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';
import { getUserBlocks } from '@/lib/get-user-blocks';

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

  const blocks = await getUserBlocks(session.user.id);
  return NextResponse.json(blocks);
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
