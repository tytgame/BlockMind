import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const createSessionSchema = z.object({
  title: z.string().max(100).optional(),
});

const SESSION_PAGE_SIZE = 20;

const SESSION_SELECT = {
  id: true,
  title: true,
  isPinned: true,
  pinnedAt: true,
  updatedAt: true,
} as const;

// GET /api/sessions — 내 채팅 세션 목록
// 응답: { pinnedSessions: [...], sessions: [...], hasMore: boolean }
// - pinnedSessions: 고정된 세션 전체 (pinnedAt desc)
// - sessions: 고정 안 된 세션 cursor 페이지네이션 (updatedAt desc)
// ?cursor=ISO_DATETIME&limit=20
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit') ?? SESSION_PAGE_SIZE), 50);

  // cursor 없을 때만 고정 세션 로드 (첫 페이지)
  const pinnedSessions = cursor
    ? []
    : await prisma.chatSession.findMany({
        where: { userId: session.user.id, isPinned: true },
        orderBy: { pinnedAt: 'desc' },
        select: SESSION_SELECT,
      });

  // 고정 안 된 세션 cursor 페이지네이션
  const items = await prisma.chatSession.findMany({
    where: {
      userId: session.user.id,
      isPinned: false,
      ...(cursor ? { updatedAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    select: SESSION_SELECT,
  });

  const hasMore = items.length > limit;
  const sessions = hasMore ? items.slice(0, limit) : items;

  return NextResponse.json({ pinnedSessions, sessions, hasMore });
}

// POST /api/sessions — 새 채팅 세션 생성
// body: { title?: string }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = createSessionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const chatSession = await prisma.chatSession.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title ?? null,
    },
  });

  return NextResponse.json(chatSession, { status: 201 });
}
