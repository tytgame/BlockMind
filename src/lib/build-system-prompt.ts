import { type Block } from '@/types/block';

/**
 * 활성화된 블록들을 시스템 프롬프트 문자열로 변환합니다.
 * isVisible=false인 블록은 제외되어 AI가 해당 내용을 인식하지 못합니다.
 */
export function buildSystemPrompt(blocks: Block[]): string {
  return blocks
    .filter((b) => b.isVisible)
    .map((b) => `[${b.type.toUpperCase()} - ${b.label}]\n${b.content}`)
    .join('\n\n');
}
