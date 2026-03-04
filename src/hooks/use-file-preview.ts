import * as React from 'react';
import type { UIMessage } from 'ai';
import { type SentFileInfo } from '@/components/chat/file-preview-modal';
import { useChatStore } from '@/store/chat-store';

export function useFilePreview(messages: UIMessage[]) {
  // 미리보기 모달 상태 — 로컬(현재 렌더에서만 필요)
  const [previewFile, setPreviewFile] = React.useState<SentFileInfo | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // messageFilesMap — Zustand에 저장하여 세션 전환 후 리마운트 시에도 유지
  const messageFilesMap = useChatStore((state) => state.messageFilesMap);
  const setMessageFiles = useChatStore((state) => state.setMessageFiles);

  // handleSubmit에서 전송 직전에 이 ref에 파일 목록을 기록한다.
  // useEffect가 새 user 메시지를 감지하면 Zustand에 저장 후 ref 초기화.
  const pendingSentFilesRef = React.useRef<SentFileInfo[] | undefined>(undefined);

  React.useEffect(() => {
    if (!pendingSentFilesRef.current || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'user') {
      const files = pendingSentFilesRef.current;
      pendingSentFilesRef.current = undefined;
      setMessageFiles(last.id, files);
    }
  }, [messages, setMessageFiles]);

  const openPreview = React.useCallback((file: SentFileInfo) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  }, []);

  const closePreview = React.useCallback(() => {
    setPreviewOpen(false);
    setPreviewFile(null);
  }, []);

  return {
    previewFile,
    previewOpen,
    messageFilesMap,
    openPreview,
    closePreview,
    pendingSentFilesRef,
  };
}
