import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/blocks — 내 블록 목록 (order 오름차순)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const blocks = await prisma.block.findMany({
    where: { userId: session.user.id },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(blocks);
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
  };

  const block = await prisma.block.create({
    data: {
      userId: session.user.id,
      type: body.type,
      label: body.label,
      content: body.content,
      color: body.color,
      order: body.order,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
