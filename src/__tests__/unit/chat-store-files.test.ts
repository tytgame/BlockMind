/**
 * chat-store — messageFilesMap 파일 첨부 지속성 테스트
 *
 * 로그아웃/재로그인 후 세션 복원 시 파일 메타데이터가
 * messageFilesMap에 올바르게 복원되는지 검증한다.
 */

import { useChatStore } from '@/store/chat-store';
import type { SentFileInfo } from '@/components/chat/file-preview-modal';

beforeEach(() => {
  useChatStore.setState({
    input: '',
    sessionId: null,
    pendingMessages: [],
    mountKey: 'initial',
    messageFilesMap: {},
  });
});

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function makeFileInfo(overrides?: Partial<SentFileInfo>): SentFileInfo {
  return {
    fileName: 'photo.jpg',
    fileType: 'image/jpeg',
    storagePath: 'user-abc/123-photo.jpg',
    ...overrides,
  };
}

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('chat-store — messageFilesMap', () => {
  // ── setMessageFiles ────────────────────────────────────────────────────

  describe('setMessageFiles', () => {
    it('messageId에 파일 목록을 저장한다', () => {
      const files = [makeFileInfo()];
      useChatStore.getState().setMessageFiles('msg-1', files);

      expect(useChatStore.getState().messageFilesMap['msg-1']).toEqual(files);
    });

    it('여러 messageId에 각각 저장할 수 있다', () => {
      const files1 = [makeFileInfo({ fileName: 'a.jpg' })];
      const files2 = [makeFileInfo({ fileName: 'b.pdf', fileType: 'application/pdf' })];

      useChatStore.getState().setMessageFiles('msg-1', files1);
      useChatStore.getState().setMessageFiles('msg-2', files2);

      const { messageFilesMap } = useChatStore.getState();
      expect(messageFilesMap['msg-1']).toEqual(files1);
      expect(messageFilesMap['msg-2']).toEqual(files2);
    });

    it('같은 messageId에 다시 저장하면 덮어쓴다', () => {
      const original = [makeFileInfo({ fileName: 'original.jpg' })];
      const updated = [makeFileInfo({ fileName: 'updated.jpg' })];

      useChatStore.getState().setMessageFiles('msg-1', original);
      useChatStore.getState().setMessageFiles('msg-1', updated);

      expect(useChatStore.getState().messageFilesMap['msg-1']).toEqual(updated);
    });

    it('base64 없이 storagePath만으로 저장된다 (DB 복원 시나리오)', () => {
      const filesWithoutBase64: SentFileInfo[] = [
        { fileName: 'photo.jpg', fileType: 'image/jpeg', storagePath: 'user/123-photo.jpg' },
      ];

      useChatStore.getState().setMessageFiles('msg-1', filesWithoutBase64);

      const stored = useChatStore.getState().messageFilesMap['msg-1'];
      expect(stored[0].base64).toBeUndefined();
      expect(stored[0].storagePath).toBe('user/123-photo.jpg');
    });

    it('이미지/PDF/docx 혼합 파일도 저장된다', () => {
      const mixed: SentFileInfo[] = [
        { fileName: 'img.png', fileType: 'image/png', storagePath: 'u/img.png' },
        { fileName: 'doc.pdf', fileType: 'application/pdf', storagePath: 'u/doc.pdf' },
        {
          fileName: 'report.docx',
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          storagePath: 'u/report.docx',
        },
      ];

      useChatStore.getState().setMessageFiles('msg-mixed', mixed);

      const stored = useChatStore.getState().messageFilesMap['msg-mixed'];
      expect(stored).toHaveLength(3);
      expect(stored.map((f) => f.fileName)).toEqual(['img.png', 'doc.pdf', 'report.docx']);
    });
  });

  // ── 세션 복원 시나리오 ─────────────────────────────────────────────────

  describe('세션 복원 시뮬레이션', () => {
    it('DB 메시지에서 파일 메타를 복원하면 messageFilesMap에 반영된다', () => {
      // DB에서 로드된 메시지 (page.tsx useEffect 로직을 단순화해 시뮬레이션)
      const dbMessages = [
        {
          id: 'db-msg-1',
          role: 'user',
          clientId: 'client-uuid-1',
          files: [
            { fileName: 'cat.jpg', fileType: 'image/jpeg', storagePath: 'user/ts-cat.jpg' },
          ] as SentFileInfo[],
        },
        { id: 'db-msg-2', role: 'assistant', clientId: null, files: null },
        {
          id: 'db-msg-3',
          role: 'user',
          clientId: 'client-uuid-2',
          files: [
            { fileName: 'report.pdf', fileType: 'application/pdf', storagePath: 'user/ts-report.pdf' },
          ] as SentFileInfo[],
        },
      ];

      // page.tsx useEffect의 파일 복원 로직
      for (const m of dbMessages) {
        if (m.role === 'user' && m.files && m.files.length > 0) {
          const messageId = m.clientId ?? m.id;
          useChatStore.getState().setMessageFiles(messageId, m.files);
        }
      }

      const { messageFilesMap } = useChatStore.getState();
      // clientId가 있는 경우 clientId를 key로 사용
      expect(messageFilesMap['client-uuid-1']).toHaveLength(1);
      expect(messageFilesMap['client-uuid-1'][0].fileName).toBe('cat.jpg');
      expect(messageFilesMap['client-uuid-2']).toHaveLength(1);
      expect(messageFilesMap['client-uuid-2'][0].fileName).toBe('report.pdf');
      // assistant 메시지는 저장 안 됨
      expect(messageFilesMap['db-msg-2']).toBeUndefined();
    });

    it('clientId가 없는 user 메시지는 DB id를 key로 사용한다', () => {
      const dbMessages = [
        {
          id: 'db-msg-old',
          role: 'user',
          clientId: null, // 구버전 메시지
          files: [{ fileName: 'old.jpg', fileType: 'image/jpeg', storagePath: 'u/old.jpg' }] as SentFileInfo[],
        },
      ];

      for (const m of dbMessages) {
        if (m.role === 'user' && m.files && m.files.length > 0) {
          const messageId = m.clientId ?? m.id;
          useChatStore.getState().setMessageFiles(messageId, m.files);
        }
      }

      const { messageFilesMap } = useChatStore.getState();
      expect(messageFilesMap['db-msg-old']).toHaveLength(1);
    });

    it('파일 없는 메시지만 있으면 messageFilesMap이 비어있다', () => {
      const dbMessages = [
        { id: 'db-1', role: 'user', clientId: 'c-1', files: null },
        { id: 'db-2', role: 'assistant', clientId: null, files: null },
      ];

      for (const m of dbMessages) {
        if (m.role === 'user' && m.files && (m.files as SentFileInfo[]).length > 0) {
          useChatStore.getState().setMessageFiles(m.clientId ?? m.id, m.files as SentFileInfo[]);
        }
      }

      expect(useChatStore.getState().messageFilesMap).toEqual({});
    });

    it('복원 후 기존 messageFilesMap 항목이 유지된다 (세션 전환 불필요)', () => {
      // 이미 전송한 파일이 있는 상태
      useChatStore.getState().setMessageFiles('existing-msg', [makeFileInfo({ fileName: 'existing.jpg' })]);

      // 추가로 복원
      useChatStore.getState().setMessageFiles('restored-msg', [makeFileInfo({ fileName: 'restored.jpg' })]);

      const { messageFilesMap } = useChatStore.getState();
      expect(messageFilesMap['existing-msg']).toBeDefined();
      expect(messageFilesMap['restored-msg']).toBeDefined();
    });
  });

  // ── 기타 store 동작 ────────────────────────────────────────────────────

  describe('기타 store 액션과의 독립성', () => {
    it('newMountKey 호출해도 messageFilesMap은 유지된다', () => {
      useChatStore.getState().setMessageFiles('msg-1', [makeFileInfo()]);
      useChatStore.getState().newMountKey();

      expect(useChatStore.getState().messageFilesMap['msg-1']).toBeDefined();
    });

    it('setSessionId 호출해도 messageFilesMap은 유지된다', () => {
      useChatStore.getState().setMessageFiles('msg-1', [makeFileInfo()]);
      useChatStore.getState().setSessionId('new-session-id');

      expect(useChatStore.getState().messageFilesMap['msg-1']).toBeDefined();
    });
  });
});
