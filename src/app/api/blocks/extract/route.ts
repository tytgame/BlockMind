import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { BLOCK_CATEGORIES } from '@/types/block';

const MAX_BLOCKS_PER_CYCLE = 1;

const fileMetadataSchema = z.object({
  storagePath: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  geminiFileUri: z.string().optional(),
  geminiExpiresAt: z.string().nullable().optional(),
});

const extractRequestSchema = z.object({
  userMessage: z.string().min(1),
  assistantMessage: z.string().min(1),
  existingBlocks: z
    .array(
      z.object({
        label: z.string(),
        content: z.string(),
      })
    )
    .default([]),
  fileMetadata: fileMetadataSchema.optional(),
});

const extractResponseSchema = z.object({
  blocks: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        content: z.string().min(1).max(500),
        attachFile: z.boolean().optional(), // 파일을 이 블록에 첨부할지 여부
        category: z.enum(BLOCK_CATEGORIES).optional(), // data 블록 카테고리
      })
    )
    .max(MAX_BLOCKS_PER_CYCLE),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ blocks: [] }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const parsed = extractRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ blocks: [] }, { status: 400 });
    }

    const { userMessage, assistantMessage, existingBlocks, fileMetadata } = parsed.data;

    const fileContext = fileMetadata
      ? `\n\nNote: A file was attached to this conversation: "${fileMetadata.fileName}" (${fileMetadata.fileType}). If you create a block for this, set attachFile: true.`
      : '';

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      output: 'object',
      schema: extractResponseSchema,
      temperature: 0.2,
      system: `You extract durable memory blocks from conversations for a hidden context system.

Rules:
- Return only durable context that should persist across future turns.
- Do not include one-off requests, temporary tasks, or time-sensitive search intents.
- Do not duplicate existing blocks.
- Create at most one block for this chat cycle.
- Keep labels short and specific.
- Keep content precise and reusable.
- If a file was attached and it contains important durable information, set attachFile: true.
- If nothing should be stored, return an empty "blocks" array.
- Write the block label and content in the same language as the user's message.
- For each data block, set "category" to the single best matching value from this list:
  animal, fitness, travel, coding, food, music, study, health, work, game, finance, shopping, home, sports, entertainment, person
  Omit "category" only if none of the above fit.

This process is internal. Never produce user-facing text.${fileContext}`,
      prompt: `Existing blocks:
${JSON.stringify(existingBlocks, null, 2)}

Latest user message:
${userMessage}

Assistant answer:
${assistantMessage}`,
    });

    const extractedBlocks = result.object.blocks.slice(0, MAX_BLOCKS_PER_CYCLE);

    // attachFile이 true인 블록에 파일 필드를 최상위로 주입
    // applyExtractedBlocks가 type, fileUrl, fileName 등을 최상위 필드로 기대함
    const blocksWithFile = extractedBlocks.map((block) => {
      if (block.attachFile && fileMetadata) {
        const blockType = fileMetadata.fileType.startsWith('image/') ? 'image' : 'file';
        return {
          label: block.label,
          content: block.content,
          type: blockType,
          fileUrl: fileMetadata.storagePath,
          fileName: fileMetadata.fileName,
          fileType: fileMetadata.fileType,
          fileSize: fileMetadata.fileSize,
          ...(fileMetadata.geminiFileUri ? { geminiFileUri: fileMetadata.geminiFileUri } : {}),
          ...(fileMetadata.geminiExpiresAt ? { geminiExpiresAt: fileMetadata.geminiExpiresAt } : {}),
        };
      }
      return {
        label: block.label,
        content: block.content,
        ...(block.category ? { category: block.category } : {}),
      };
    });

    return NextResponse.json({ blocks: blocksWithFile });
  } catch {
    return NextResponse.json({ blocks: [] }, { status: 200 });
  }
}
