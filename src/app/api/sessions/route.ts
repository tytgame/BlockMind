import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/sessions — 내 채팅 세션 목록 (최신순, 사이드바용)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(sessions);
}

// POST /api/sessions — 새 채팅 세션 생성
// body: { title?: string }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { title?: string };

  const chatSession = await prisma.chatSession.create({
    data: {
      userId: session.user.id,
      title: body.title ?? null,
    },
  });

  return NextResponse.json(chatSession, { status: 201 });
}
