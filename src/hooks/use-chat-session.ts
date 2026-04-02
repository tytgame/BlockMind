'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useBlockStore } from '@/store/block-store';
import { useChatStore } from '@/store/chat-store';
import type { Block } from '@/types/block';
import type { PendingFileMeta } from '@/hooks/use-file-attachment';

// ── 타입 ──────────────────────────────────────────────────────────────────

type ExtractedBlock = {
  label: string;
  content: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  geminiFileUri?: string;
  geminiExpiresAt?: string | null;
  category?: string;
};

type ToolExtractedBlock = {
  label: string;
  content: string;
  attachFile?: boolean;
  category?: string;
};

export type HandleFinishParams = {
  userMessage: string;
  assistantMessage: string;
  userMessageId: string | undefined;
  fileMeta: PendingFileMeta | undefined;
  filesForDb: Array<{ fileName: string; fileType: string; storagePath: string }> | undefined;
  extractedBlocks: ToolExtractedBlock[];
};

interface UseChatSessionOptions {
  sessionIdRef: { current: string | null };
  locale: string;
  router: { push: (href: string) => void };
  onError: (msg: string) => void;
  errorSaveFailed: string;
}

const MAX_BLOCKS_PER_CYCLE = 1;

// 블록 생성 토스트 콘텐츠 — 애니메이션은 globals.css에서 처리
function BlockToast({ label, text }: { label: string; text: string }) {
  return React.createElement(
    'div',
    { className: 'flex items-center gap-2 bg-[#2f3235] border border-white/10 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap' },
    React.createElement(CheckCircle, { className: 'w-3.5 h-3.5 text-green-500 flex-shrink-0' }),
    React.createElement(
      'span',
      { className: 'text-xs text-gray-300' },
      `${text} \u2014 `,
      React.createElement('span', { className: 'text-white font-medium' }, label)
    )
  );
}

// ── 훅 ────────────────────────────────────────────────────────────────────

export function useChatSession({
  sessionIdRef,
  locale,
  router,
  onError,
  errorSaveFailed,
}: UseChatSessionOptions) {
  const t = useTranslations('chatInterface');

  // 블록 자동 추출 결과 적용
  const applyExtractedBlocks = React.useCallback(
    async (
      extractedBlocks: ExtractedBlock[],
      sourceSessionId: string | null,
      sourceMessageId: string | null
    ) => {
      const { blocks: currentBlocks, appendBlock } = useBlockStore.getState();
      const existingKeys = new Set(
        currentBlocks.map((b) => `${b.label.trim().toLowerCase()}::${b.content.trim().toLowerCase()}`)
      );

      let addedCount = 0;
      for (const extracted of extractedBlocks) {
        if (addedCount >= MAX_BLOCKS_PER_CYCLE) break;

        const label = extracted.label.trim();
        const content = extracted.content.trim();
        if (!label || !content) continue;

        const blockKey = `${label.toLowerCase()}::${content.toLowerCase()}`;
        if (existingKeys.has(blockKey)) continue;

        const { blocks } = useBlockStore.getState();
        const order = blocks.length;

        try {
          const blockData: Record<string, unknown> = {
            type: extracted.type ?? 'data',
            label,
            content,
            order,
          };
          if (extracted.fileUrl) blockData.fileUrl = extracted.fileUrl;
          if (extracted.fileName) blockData.fileName = extracted.fileName;
          if (extracted.fileType) blockData.fileType = extracted.fileType;
          if (extracted.fileSize !== undefined) blockData.fileSize = extracted.fileSize;
          if (extracted.geminiFileUri) blockData.geminiFileUri = extracted.geminiFileUri;
          if (extracted.geminiExpiresAt !== undefined) blockData.geminiExpiresAt = extracted.geminiExpiresAt;
          if (sourceSessionId) blockData.sourceSessionId = sourceSessionId;
          if (sourceMessageId) blockData.sourceMessageId = sourceMessageId;
          if (extracted.category) blockData.category = extracted.category;

          const res = await fetch('/api/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blockData),
          });
          if (!res.ok) {
            console.error('[useChatSession] 블록 생성 실패:', res.status);
            continue;
          }
          const dbBlock = (await res.json()) as Block;
          appendBlock(dbBlock);
          toast.custom(
            () => React.createElement(BlockToast, { label, text: t('blockCreated') }),
            { duration: 3000, style: { background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' } }
          );
          existingKeys.add(blockKey);
          addedCount += 1;
        } catch (err) {
          console.error('[useChatSession] 블록 생성 네트워크 오류:', err);
        }
      }
    },
    [t]
  );

  // AI 응답 완료 후 세션 저장 · 메시지 저장 · 블록 추출 처리
  const handleFinish = React.useCallback(
    async ({ userMessage, assistantMessage, userMessageId, fileMeta, filesForDb, extractedBlocks }: HandleFinishParams) => {
      // 1. 세션 생성 (신규 채팅인 경우에만)
      let currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        try {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage }),
          });
          if (!res.ok) {
            console.error('[useChatSession] 세션 생성 실패:', res.status);
            onError(errorSaveFailed);
            return;
          }
          const created = (await res.json()) as { id: string };
          currentSessionId = created.id;
          sessionIdRef.current = currentSessionId;
          // 리마운트 없이 URL만 업데이트 — 새로고침 시 /chat/[id]로 복원 가능
          const pathPrefix = locale === 'ko' ? '' : `/${locale}`;
          window.history.replaceState(null, '', `${pathPrefix}/chat/${currentSessionId}`);
          // replaceState는 useParams를 트리거하지 않으므로 store로 사이드바에 알림
          useChatStore.getState().setLastCreatedSessionId(currentSessionId);
        } catch (err) {
          console.error('[useChatSession] 세션 생성 네트워크 오류:', err);
          onError(errorSaveFailed);
          return;
        }
      }

      // 2. 메시지 저장
      try {
        const msgRes = await fetch(`/api/sessions/${currentSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage, assistantMessage, userMessageId, userMessageFiles: filesForDb }),
        });
        if (msgRes.status === 404) {
          // 세션 없음 (계정 전환 등) → 새 채팅으로 리다이렉트
          sessionIdRef.current = null;
          router.push('/chat');
          return;
        }
        if (!msgRes.ok) {
          console.error('[useChatSession] 메시지 저장 실패:', msgRes.status);
          onError(errorSaveFailed);
          return;
        }
      } catch (err) {
        console.error('[useChatSession] 메시지 저장 네트워크 오류:', err);
        onError(errorSaveFailed);
        return;
      }

      // 3. tool use로 추출된 블록 적용 — 실패해도 사용자에게 알리지 않음
      if (extractedBlocks.length > 0) {
        try {
          // 파일 첨부 enrichment: attachFile=true + fileMeta → 파일 블록으로 변환
          const enriched: ExtractedBlock[] = extractedBlocks.slice(0, MAX_BLOCKS_PER_CYCLE).map((block) => {
            if (block.attachFile && fileMeta) {
              const blockType = fileMeta.fileType.startsWith('image/') ? 'image' : 'file';
              return {
                label: block.label,
                content: block.content,
                type: blockType,
                fileUrl: fileMeta.storagePath,
                fileName: fileMeta.fileName,
                fileType: fileMeta.fileType,
                fileSize: fileMeta.fileSize,
                ...(fileMeta.geminiFileUri ? { geminiFileUri: fileMeta.geminiFileUri } : {}),
                ...(fileMeta.geminiExpiresAt !== undefined ? { geminiExpiresAt: fileMeta.geminiExpiresAt } : {}),
              };
            }
            return {
              label: block.label,
              content: block.content,
              ...(block.category ? { category: block.category } : {}),
            };
          });
          await applyExtractedBlocks(enriched, currentSessionId, userMessageId ?? null);
        } catch (err) {
          console.error('[useChatSession] 블록 적용 오류:', err);
        }
      }
    },
    [sessionIdRef, locale, router, onError, errorSaveFailed, applyExtractedBlocks]
  );

  return { handleFinish };
}
