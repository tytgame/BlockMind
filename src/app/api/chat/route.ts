import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, systemPrompt } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-pro-latest'), // or gemini-1.5-flash
    system: `You are BlockMind, an AI assistant that helps users structure their thoughts using "Context Blocks".
    
    Current Context Blocks:
    ${systemPrompt || '(No blocks defined yet)'}
    
    Your goal is to understand the user's intent and, if necessary, CREATE or UPDATE blocks to represent the current context.
    - If the user defines a persona, create a 'persona' block.
    - If the user sets a rule, create a 'rule' block.
    - If the user provides data, create a 'data' block.
    - If the user specifies an output format, create an 'output' block.
    
    Always call the relevant tools when context changes. Don't just talk about it, DO it.`,
    messages,
    tools: {
      createBlock: tool({
        description: 'Create a new context block to store information.',
        parameters: z.object({
          type: z.enum(['persona', 'rule', 'data', 'output']).describe('The type of the block'),
          label: z.string().describe('A short label for the block (e.g., "Marketing Persona", "No Emojis Rule")'),
          content: z.string().describe('The full content/prompt of the block'),
        }),
        execute: async ({ type, label, content }) => {
          // In a real app with DB, we would save to DB here.
          // Since we are using client-side store for MVP, we return the instruction 
          // and let the client handle it via tool invocations (requires client-side handling).
          // However, Vercel AI SDK 'streamText' executes tools on server.
          // For client-side state update, we can return a special confirmation string
          // or use 'onToolCall' in client.
          // For this MVP, we will rely on the client 'useChat' to receive the tool call info.
          return { id: Math.random().toString(36).substring(7), type, label, content };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
