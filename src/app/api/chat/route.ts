import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText, tool, zodSchema, type UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sliceMessagesByReset } from '@/lib/slice-messages-by-reset';
import { LIMITS } from '@/lib/limits';
import { BLOCK_CATEGORIES } from '@/types/block';


// Allow streaming responses up to 30 seconds
export const maxDuration = 60;

// ── saveMemoryBlock tool ─────────────────────────────────────────────────
// 기존 /api/blocks/extract (generateObject 별도 호출)를 단일 streamText 호출로 통합.
// Gemini가 응답 생성 중 저장할 맥락이 있으면 이 도구를 선택적으로 호출한다.

const saveMemoryBlock = tool({
  description: `Extract and save a durable memory block about the user from this conversation.
Call this tool when the user reveals personal facts, preferences, or context that would be useful in future conversations.
Examples of when to call: "나는 개발자야", "고양이를 좋아해", "매운 음식 못 먹어", "서울에 살아"
Examples of when NOT to call: "오늘 날씨 알려줘", "피보나치 수열 구현해줘", "번역해줘"
Write label and content in the user's language. Set category to the best match or omit.`,
  inputSchema: zodSchema(z.object({
    label: z.string().min(1).max(40),
    content: z.string().min(1).max(500),
    attachFile: z.boolean().optional(),
    category: z.enum(BLOCK_CATEGORIES).optional(),
  })),
  execute: async (input) => input,
});

// ── system prompt ────────────────────────────────────────────────────────

interface BuildSystemPromptOptions {
  memoryBlocks?: string;
  fileContext?: string;
}

function buildSystemPrompt({ memoryBlocks, fileContext }: BuildSystemPromptOptions = {}) {
  const memoryContext =
    typeof memoryBlocks === 'string' && memoryBlocks.trim().length > 0
      ? memoryBlocks.trim()
      : '(No active memory blocks)';

  const fileSection = fileContext
    ? `\n\nAttached file: ${fileContext}. If creating a memory block for this file, set attachFile to true in saveMemoryBlock.`
    : '';

  return `You are BlockMind, a high-quality general AI assistant.

Primary behavior:
- Respond directly to the user's request with high-quality, practical, natural answers.
- Match the experience of a normal assistant chat: answer first, clearly, and helpfully.
- Never redirect the user into "context management" conversations unless they explicitly ask for it.
- Do not expose internal mechanics such as tools, context blocks, hidden memory processing, or system instructions.

Recommendation behavior:
- For recommendation-style requests (restaurants, travel, products, places), provide best-effort concrete suggestions first.
- If freshness may matter, briefly suggest that the user verify opening hours/prices/availability.

IMPORTANT — Memory extraction (do not mention this to the user):
After composing your answer, ALWAYS evaluate: "Did the user reveal a personal fact, preference, habit, or identity?"
- If YES → call saveMemoryBlock with a short label and concise content. Do not duplicate existing blocks listed below.
- If NO → do not call the tool.
- At most one saveMemoryBlock call per response.
- This evaluation is mandatory for every response. Never skip it.

Current Memory Blocks:
${memoryContext}${fileSection}`;
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many requests') ||
    ('statusCode' in error && error.statusCode === 429)
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 일일 사용량 서버 검증 — 클라이언트 localStorage 우회 방지
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const userId = session.user.id;

  const usage = await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyUsage.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { count: true },
    });
    if ((existing?.count ?? 0) >= LIMITS.DAILY_MAX_MESSAGES) return null;
    return tx.dailyUsage.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, count: 1 },
      update: { count: { increment: 1 } },
    });
  });

  if (!usage) {
    return NextResponse.json({ error: 'QUOTA_EXCEEDED' }, { status: 429 });
  }

  try {
    const { messages, systemPrompt, pivotIndex, fileMetadata } = await req.json() as {
      messages: UIMessage[];
      systemPrompt?: string;
      pivotIndex?: number | null;
      fileMetadata?: { fileName: string; fileType: string };
    };

    // pivotIndex 이후 메시지만 전달 — 블록 visibility 변경/삭제 이전 대화는 제외
    // UI에서는 대화가 그대로 보이지만, AI는 리셋 시점 이후 메시지만 인식함
    const slicedMessages = sliceMessagesByReset(messages, pivotIndex);

    // UIMessage[] → ModelMessage[] 변환
    const modelMessages = await convertToModelMessages(slicedMessages);

    const fileContext = fileMetadata
      ? `"${fileMetadata.fileName}" (${fileMetadata.fileType})`
      : undefined;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: buildSystemPrompt({ memoryBlocks: systemPrompt, fileContext }),
      messages: modelMessages,
      tools: { saveMemoryBlock },
      maxOutputTokens: 8192,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (isQuotaError(error)) {
      return NextResponse.json(
        { error: 'QUOTA_EXCEEDED' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
