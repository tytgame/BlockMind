import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const SESSION_PAGE_SIZE = 20;

// GET /api/sessions — 내 채팅 세션 목록 (최신순, cursor 기반 페이지네이션)
// ?cursor=ISO_DATETIME&limit=20
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit') ?? SESSION_PAGE_SIZE), 50);

  const items = await prisma.chatSession.findMany({
    where: {
      userId: session.user.id,
      ...(cursor ? { updatedAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1, // 1개 더 가져와서 hasMore 판단
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  const hasMore = items.length > limit;
  const sessions = hasMore ? items.slice(0, limit) : items;

  return NextResponse.json({ sessions, hasMore });
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
