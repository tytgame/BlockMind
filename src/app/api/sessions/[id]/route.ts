import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';

// GET /api/sessions/[id] — 특정 세션의 메시지 목록 (시간순)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const chatSession = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!chatSession || chatSession.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(chatSession);
}

// PATCH /api/sessions/[id] — 세션 제목 수정 또는 고정 토글
// body: { title?: string } | { isPinned?: boolean }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as { title?: string; isPinned?: boolean };

  const existing = await prisma.chatSession.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data: { title?: string; isPinned?: boolean; pinnedAt?: Date | null } = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.isPinned !== undefined) {
    data.isPinned = body.isPinned;
    data.pinnedAt = body.isPinned ? new Date() : null;
  }

  const updated = await prisma.chatSession.update({ where: { id }, data });

  return NextResponse.json(updated);
}

// DELETE /api/sessions/[id] — 세션 삭제 (메시지 cascade + Storage 파일 + 연결 블록)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      messages: { select: { files: true } },
      blocks: { select: { id: true, fileUrl: true } },
    },
  });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 1. Supabase Storage에서 삭제할 경로 수집
  const storagePaths: string[] = [];

  // 메시지 첨부 파일 (Message.files JSON 배열)
  for (const msg of existing.messages) {
    if (!msg.files) continue;
    const files = msg.files as Array<{ storagePath?: string }>;
    for (const f of files) {
      if (f.storagePath) storagePaths.push(f.storagePath);
    }
  }

  // 블록 첨부 파일
  for (const block of existing.blocks) {
    if (block.fileUrl) storagePaths.push(block.fileUrl);
  }

  // 2. Storage 파일 삭제 (fire-and-forget 방식으로 실패해도 계속 진행)
  if (storagePaths.length > 0) {
    try {
      const supabase = createAdminClient();
      await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
    } catch { /* Storage 삭제 실패 무시 — DB 삭제는 계속 진행 */ }
  }

  // 3. 연결된 블록 DB 삭제 (sourceSessionId === id)
  if (existing.blocks.length > 0) {
    await prisma.block.deleteMany({ where: { sourceSessionId: id } });
  }

  // 4. 세션 삭제 (Messages는 Cascade)
  await prisma.chatSession.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
