import { sliceMessagesByReset } from '@/lib/slice-messages-by-reset';

type TestMessage = {
  id: string;
  role: 'user' | 'assistant';
};

function makeMsg(id: string, role: 'user' | 'assistant' = 'user'): TestMessage {
  return { id, role };
}

describe('sliceMessagesByReset — 인덱스 기반 메시지 슬라이싱', () => {
  // ──────────────────────────────────────────
  // pivotIndex가 null/undefined일 때
  // ──────────────────────────────────────────
  describe('pivotIndex가 null/undefined일 때', () => {
    it('null이면 전체 메시지를 그대로 반환한다', () => {
      const messages = [makeMsg('1'), makeMsg('2'), makeMsg('3')];
      expect(sliceMessagesByReset(messages, null)).toHaveLength(3);
    });

    it('undefined이면 전체 메시지를 그대로 반환한다', () => {
      const messages = [makeMsg('1'), makeMsg('2')];
      expect(sliceMessagesByReset(messages, undefined)).toHaveLength(2);
    });

    it('빈 배열 + null이면 빈 배열을 반환한다', () => {
      expect(sliceMessagesByReset([], null)).toEqual([]);
    });

    it('빈 배열 + undefined이면 빈 배열을 반환한다', () => {
      expect(sliceMessagesByReset([], undefined)).toEqual([]);
    });
  });

  // ──────────────────────────────────────────
  // 슬라이싱 기본 동작
  // ──────────────────────────────────────────
  describe('슬라이싱 기본 동작', () => {
    it('pivotIndex=0이면 전체 메시지를 반환한다', () => {
      const messages = [makeMsg('1'), makeMsg('2'), makeMsg('3')];
      const result = sliceMessagesByReset(messages, 0);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
    });

    it('pivotIndex=2이면 인덱스 2 이후 메시지만 반환한다', () => {
      const messages = [makeMsg('1'), makeMsg('2'), makeMsg('3'), makeMsg('4')];
      const result = sliceMessagesByReset(messages, 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('4');
    });

    it('pivotIndex가 배열 길이와 같으면 빈 배열을 반환한다', () => {
      const messages = [makeMsg('1'), makeMsg('2')];
      const result = sliceMessagesByReset(messages, 2);
      expect(result).toHaveLength(0);
    });

    it('pivotIndex가 배열 길이보다 크면 빈 배열을 반환한다', () => {
      const messages = [makeMsg('1'), makeMsg('2')];
      const result = sliceMessagesByReset(messages, 99);
      expect(result).toHaveLength(0);
    });

    it('pivotIndex=1이면 첫 번째 메시지를 제외한 나머지를 반환한다', () => {
      const messages = [makeMsg('a'), makeMsg('b'), makeMsg('c')];
      const result = sliceMessagesByReset(messages, 1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('b');
      expect(result[1].id).toBe('c');
    });
  });

  // ──────────────────────────────────────────
  // 반환값 참조 검증
  // ──────────────────────────────────────────
  describe('반환값 정확성', () => {
    it('반환된 메시지는 원본 객체와 동일하다 (얕은 복사)', () => {
      const msg1 = makeMsg('1');
      const msg2 = makeMsg('2');
      const messages = [msg1, msg2];
      const result = sliceMessagesByReset(messages, 1);
      expect(result[0]).toBe(msg2); // 동일 참조
    });

    it('원본 배열은 변경되지 않는다', () => {
      const messages = [makeMsg('1'), makeMsg('2'), makeMsg('3')];
      sliceMessagesByReset(messages, 1);
      expect(messages).toHaveLength(3); // 원본 유지
    });
  });

  // ──────────────────────────────────────────
  // 실제 시나리오: 블록 visibility 토글 흐름
  // ──────────────────────────────────────────
  describe('실제 시나리오: 블록 visibility 토글', () => {
    it('블록 숨기기 이전 대화(2개)는 AI에게 전달되지 않는다', () => {
      // messages[0]: "나는 홍길동이야" (user)
      // messages[1]: AI 답변
      // → 블록 invisible: pivotIndex = 2
      // messages[2]: "내 이름이 뭐야?" (user) — 이것만 전달
      const messages = [
        makeMsg('user-1', 'user'),
        makeMsg('ai-1', 'assistant'),
        makeMsg('user-2', 'user'),
      ];

      const result = sliceMessagesByReset(messages, 2);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-2');
    });

    it('블록 삭제 후 새 대화만 AI에게 전달된다', () => {
      const messages = [
        makeMsg('user-1', 'user'),     // 이전 대화 — 제외
        makeMsg('ai-1', 'assistant'),  // 이전 대화 — 제외
        makeMsg('user-2', 'user'),     // 삭제 후 새 대화 — 포함
        makeMsg('ai-2', 'assistant'),  // 삭제 후 새 대화 — 포함
      ];

      const result = sliceMessagesByReset(messages, 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-2');
      expect(result[1].id).toBe('ai-2');
    });

    it('두 번 토글 시 마지막 pivotIndex 기준으로 슬라이싱된다', () => {
      // 첫 번째 토글: pivotIndex=2, 이후 대화 2건 발생 → messages 4개
      // 두 번째 토글: pivotIndex=4
      const messages = [
        makeMsg('msg-1'), // 제외
        makeMsg('msg-2'), // 제외
        makeMsg('msg-3'), // 제외 (첫 번째 토글 이후지만 두 번째 이전)
        makeMsg('msg-4'), // 제외
        makeMsg('msg-5'), // 포함
      ];

      const result = sliceMessagesByReset(messages, 4);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-5');
    });

    it('pivotIndex가 null이면 블록 토글이 없었던 것처럼 전체 대화를 전달한다', () => {
      const messages = [
        makeMsg('user-1', 'user'),
        makeMsg('ai-1', 'assistant'),
        makeMsg('user-2', 'user'),
      ];

      const result = sliceMessagesByReset(messages, null);
      expect(result).toHaveLength(3);
    });
  });
});
