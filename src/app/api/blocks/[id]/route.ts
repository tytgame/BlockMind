import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/blocks/[id] — 블록 수정 (label, content, isVisible, order)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as Partial<{
    label: string;
    content: string;
    isVisible: boolean;
    order: number;
  }>;

  // 본인 블록인지 확인
  const existing = await prisma.block.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.block.update({
    where: { id },
    data: body,
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

  await prisma.block.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
