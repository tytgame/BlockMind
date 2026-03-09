import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const saveMessagesSchema = z.object({
  userMessage: z.string().min(1).max(1_000),
  assistantMessage: z.string().min(1).max(50_000),
  userMessageId: z.string().max(100).optional(),
  userMessageFiles: z.array(z.object({
    fileName: z.string().max(255),
    fileType: z.string().max(100),
    storagePath: z.string().max(500),
  })).max(10).optional(),
});

// POST /api/sessions/[id]/messages — user/assistant 메시지 쌍 저장
// body: { userMessage: string; assistantMessage: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // 본인 세션인지 확인
  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });
  if (!chatSession || chatSession.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const parsed = saveMessagesSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { userMessage, assistantMessage, userMessageId, userMessageFiles } = parsed.data;

  // user → assistant 순서로 저장
  // clientId: AI SDK 클라이언트 UUID — 세션 복원 시 messageFilesMap 키 일치에 사용
  await prisma.message.createMany({
    data: [
      {
        sessionId,
        role: 'user',
        content: userMessage,
        clientId: userMessageId,
        files: userMessageFiles && userMessageFiles.length > 0 ? userMessageFiles : undefined,
      },
      { sessionId, role: 'assistant', content: assistantMessage },
    ],
  });

  // 세션 updatedAt 갱신 (사이드바 최신순 정렬에 필요)
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return new NextResponse(null, { status: 201 });
}
