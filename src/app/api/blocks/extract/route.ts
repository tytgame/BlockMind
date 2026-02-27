import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const MAX_BLOCKS_PER_CYCLE = 1;

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
});

const extractResponseSchema = z.object({
  blocks: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        content: z.string().min(1).max(500),
      })
    )
    .max(MAX_BLOCKS_PER_CYCLE),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = extractRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ blocks: [] }, { status: 400 });
    }

    const { userMessage, assistantMessage, existingBlocks } = parsed.data;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
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
- If nothing should be stored, return an empty "blocks" array.

This process is internal. Never produce user-facing text.`,
      prompt: `Existing blocks:
${JSON.stringify(existingBlocks, null, 2)}

Latest user message:
${userMessage}

Assistant answer:
${assistantMessage}`,
    });

    return NextResponse.json({
      blocks: result.object.blocks.slice(0, MAX_BLOCKS_PER_CYCLE),
    });
  } catch {
    return NextResponse.json({ blocks: [] }, { status: 200 });
  }
}
