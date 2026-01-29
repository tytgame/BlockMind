import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, systemPrompt } = await req.json();

  // UIMessage[] → ModelMessage[] 변환
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: `You are BlockMind, an AI assistant that helps users structure their thoughts using "Context Blocks".
    
    Current Context Blocks:
    ${systemPrompt || '(No blocks defined yet)'}
    
    Your goal is to understand the user's intent and, if necessary, CREATE or UPDATE blocks to represent the current context.
    - If the user defines a persona, create a 'persona' block.
    - If the user sets a rule, create a 'rule' block.
    - If the user provides data, create a 'data' block.
    - If the user specifies an output format, create an 'output' block.
    
    Always call the relevant tools when context changes. Don't just talk about it, DO it.`,
    messages: modelMessages,
    tools: {
      createBlock: {
        description: 'Create a new context block to store information.',
        inputSchema: z.object({
          type: z.enum(['persona', 'rule', 'data', 'output']).describe('The type of the block'),
          label: z.string().describe('A short label for the block (e.g., "Marketing Persona", "No Emojis Rule")'),
          content: z.string().describe('The full content/prompt of the block'),
        }),
        // execute는 선택사항입니다. Client-side의 onToolCall에서 처리합니다.
        // 서버에서는 tool call만 전달하고, 실제 블록 생성은 클라이언트가 담당합니다.
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
