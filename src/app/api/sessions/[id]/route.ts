import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

// DELETE /api/sessions/[id] — 세션 삭제 (메시지 cascade)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.chatSession.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.chatSession.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
