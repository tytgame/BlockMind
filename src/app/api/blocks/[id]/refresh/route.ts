import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/blocks/[id]/refresh — 만료된 Gemini 파일 재업로드
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const block = await prisma.block.findUnique({ where: { id } });
  if (!block || block.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!block.fileUrl || !block.fileType || !block.fileName) {
    return NextResponse.json({ error: 'Block has no file attachment' }, { status: 400 });
  }

  // Gemini Files API 재업로드
  const baseUrl = process.env.NEXTAUTH_URL;
  const uploadRes = await fetch(`${baseUrl}/api/upload/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: _req.headers.get('Cookie') ?? '' },
    body: JSON.stringify({
      storagePath: block.fileUrl,
      mimeType: block.fileType,
      fileName: block.fileName,
    }),
  });

  if (!uploadRes.ok) {
    return NextResponse.json({ error: 'Failed to re-upload to Gemini' }, { status: 500 });
  }

  const { geminiFileUri, geminiExpiresAt } = (await uploadRes.json()) as {
    geminiFileUri: string;
    geminiExpiresAt: string | null;
  };

  const updated = await prisma.block.update({
    where: { id },
    data: {
      geminiFileUri,
      geminiExpiresAt: geminiExpiresAt ? new Date(geminiExpiresAt) : null,
    },
  });

  return NextResponse.json(updated);
}
