import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/blocks/reorder — 블록 순서 일괄 업데이트
// body: { orderedIds: string[] } — 새 순서대로 정렬된 id 배열
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { orderedIds } = (await req.json()) as { orderedIds: string[] };

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // 각 블록의 order 값을 배열 인덱스로 일괄 업데이트
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.block.updateMany({
        where: { id, userId },
        data: { order: index },
      })
    )
  );

  return new NextResponse(null, { status: 204 });
}
