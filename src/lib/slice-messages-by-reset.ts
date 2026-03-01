/**
 * pivotIndex 기준으로 메시지를 슬라이싱합니다.
 *
 * - pivotIndex: 블록 visibility 변경/삭제 시점의 messages.length
 * - pivotIndex 이후 메시지만 반환 → AI가 리셋 이전 대화를 볼 수 없음
 * - null/undefined이면 전체 반환 (리셋 없음)
 *
 * createdAt 필드 불필요 — 배열 인덱스 기반이라 SDK 의존성 없음
 */
export function sliceMessagesByReset<T>(
  messages: T[],
  pivotIndex: number | null | undefined
): T[] {
  if (pivotIndex == null) return messages;
  return messages.slice(pivotIndex);
}
