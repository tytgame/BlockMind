import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';

const patchBlockSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10_000).optional(),
  isVisible: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  fileUrl: z.string().max(500).optional(),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
  geminiFileUri: z.string().max(500).optional(),
  geminiExpiresAt: z.string().nullable().optional(),
});

// PATCH /api/blocks/[id] — 블록 수정 (isVisible, order)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const parsed = patchBlockSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const body = parsed.data;

  // 본인 블록인지 확인
  const existing = await prisma.block.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.block.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: body.label }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.fileUrl !== undefined && { fileUrl: body.fileUrl }),
      ...(body.fileName !== undefined && { fileName: body.fileName }),
      ...(body.fileType !== undefined && { fileType: body.fileType }),
      ...(body.fileSize !== undefined && { fileSize: body.fileSize }),
      ...(body.geminiFileUri !== undefined && { geminiFileUri: body.geminiFileUri }),
      ...(body.geminiExpiresAt !== undefined && {
        geminiExpiresAt: body.geminiExpiresAt ? new Date(body.geminiExpiresAt) : null,
      }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/blocks/[id] — 블록 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 본인 블록인지 확인
  const existing = await prisma.block.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Storage 파일 삭제 (file/image 블록인 경우)
  if (existing.fileUrl) {
    try {
      const supabase = createAdminClient();
      await supabase.storage.from(STORAGE_BUCKET).remove([existing.fileUrl]);
    } catch { /* Storage 삭제 실패 무시 — DB 삭제는 계속 진행 */ }
  }

  await prisma.block.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
