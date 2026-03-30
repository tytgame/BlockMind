# BlockMind 포트폴리오 — 두 번째 트러블슈팅 작성 가이드

## 프로젝트 개요

BlockMind는 AI 채팅 앱으로, 사용자가 "컨텍스트 블록"을 시각적으로 관리하고 AI 대화에 주입하는 서비스.
- Tech: Next.js App Router, TypeScript, Zustand, Tailwind CSS, Supabase, Prisma
- 3-Column 레이아웃: 좌측 ChatSidebar | 중앙 ChatInterface | 우측 BlockList

## 작성할 섹션

**"문제 상황 : 페이지 리로드 시 빈 화면이 순간 노출되는 문제"**

포트폴리오의 두 번째 트러블슈팅. 구조: 원인 → 해결 과정 → 결과

## 핵심 프레이밍

- 이 문제의 본질: **CSR 구조에서 데이터 주입 시점의 한계**를 인식하고, **SSR 하이브리드로 전환한 아키텍처 판단**
- 첫 번째 트러블슈팅(pivotIndex 기반 메시지 슬라이싱)에서 "상태 분리 설계"를 이미 다뤘으므로, 이번에는 **렌더링 아키텍처 전환**에 초점
- 대안 A/B/C 비교 구조는 사용하지 않음. 자연스러운 해결 과정 흐름으로 서술

## 문제 상황

- `/chat` 페이지 새로고침 시:
  - 블록 패널: "블록이 없습니다"가 100~500ms 노출 후 실제 블록 표시
  - 채팅 영역: 빈 채팅 화면이 먼저 렌더된 뒤 이전 대화 복원
- 느린 네트워크에서 1초 이상 유지

## 원인

- `layout.tsx` 전체가 `'use client'` → 100% CSR 구조
- Zustand store 초기값 `blocks: []` → `useEffect`로 `/api/blocks` fetch → 응답 전까지 빈 배열 렌더
- **"데이터를 아직 불러오는 중"과 "진짜 데이터가 없음"이 동일한 UI로 표시**되는 상태 구분 부재
- CSR에서는 "첫 프레임에 데이터가 없다"는 근본 문제를 해결 불가 → 데이터 주입 시점을 서버로 올려야 함

## 수정 전 코드 (layout.tsx)

```tsx
'use client';

import { useBlocksInit } from '@/hooks/use-blocks-init';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  useBlocksInit();   // useEffect로 /api/blocks fetch
  // ... Zustand hooks, UI 렌더링 전부 이 컴포넌트 안에 있었음
}
```

## 수정 후 코드

### layout.tsx — async Server Component로 전환

```tsx
import { auth } from '@/auth';
import { getUserBlocks } from '@/lib/get-user-blocks';
import { ClientChatLayout } from '@/components/chat/client-chat-layout';
import { Block } from '@/types/block';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  let initialBlocks: Block[] = [];

  try {
    const session = await auth();
    if (session?.user?.id) {
      initialBlocks = await getUserBlocks(session.user.id);
    }
  } catch {
    // 서버 데이터 실패 시 빈 배열 → 클라이언트 fallback이 처리
  }

  return (
    <ClientChatLayout initialBlocks={initialBlocks}>
      {children}
    </ClientChatLayout>
  );
}
```

### client-chat-layout.tsx — Zustand에 동기 주입 (핵심)

```tsx
'use client';

export function ClientChatLayout({ children, initialBlocks }: ClientChatLayoutProps) {
  // 서버에서 받은 블록을 Zustand store에 동기 주입 (첫 프레임부터 데이터 존재)
  const initializedRef = React.useRef(false);
  if (!initializedRef.current && initialBlocks.length > 0) {
    useBlockStore.getState().setBlocks(initialBlocks);
    initializedRef.current = true;
  }

  // fallback: 서버 데이터가 비어있으면 클라이언트에서 재시도
  useBlocksInit(initialBlocks.length > 0);
  // ...
}
```

**왜 useEffect가 아니라 useRef + 렌더 단계 직접 호출인가:**
- useEffect는 렌더가 끝난 후 실행 → 첫 렌더에서 여전히 빈 배열 → flash 그대로
- useRef + getState().setBlocks()는 렌더 단계에서 동기적으로 store 갱신 → 첫 프레임부터 데이터 존재

### use-blocks-init.ts — skip 파라미터 추가

```tsx
export function useBlocksInit(skip = false) {
  useEffect(() => {
    if (skip) return;  // 서버 데이터 있으면 fetch 생략
    // ... 기존 fetch('/api/blocks') 로직
  }, [setBlocks, skip]);
}
```

### get-user-blocks.ts — 서버/API 공유 로직

기존 `/api/blocks` GET 라우트에 있던 Prisma 조회 + Supabase signedUrl 주입 로직을 별도 함수로 추출.
Server Component와 API 라우트가 동일한 로직을 공유.

### [sessionId]/page.tsx — 채팅 영역 스피너

```tsx
export default function SessionPage() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // DB에서 메시지 fetch → 완료 시 setReady(true)
  }, [sessionId]);

  if (!ready) {
    return <Spinner size="md" />;
  }
  return <ChatInterface sessionId={sessionId} />;
}
```

## 채팅 영역을 SSR로 전환하지 않은 이유

- **TTFB 지연**: 메시지가 수백 개인 세션을 SSR하면 서버 조회 완료까지 HTML 자체가 전송되지 않아 스피너보다 나쁜 UX
- **AI SDK 제약**: `useChat` 훅이 메시지 배열을 자체 관리하면서 스트리밍 처리 → 서버 주입 데이터와의 동기화 복잡도가 높음
- **블록은 layout(모든 세션 공통), 메시지는 page(세션마다 다름)** → SSR 이점이 상대적으로 작음
- GPT, Gemini 등 대형 서비스도 채팅 메시지는 CSR + 로딩 상태 방식 사용

## 결과 비교표

|  | 수정 전 (CSR) | 수정 후 (SSR + CSR) |
|---|---|---|
| 블록 패널 | "블록이 없습니다" flash | 즉시 표시 (flash 없음) |
| 메인 채팅 | 빈 채팅 화면 → 복원 | 스피너 → 복원 |
| 네트워크 요청 | HTML + `/api/blocks` (2회) | HTML에 블록 포함 (1회) |
| 느린 네트워크 | flash 1초+ | 영향 없음 (블록) |

## Before/After 동영상 설명

- **Before**: 새로고침 → 블록 패널 "블록이 없습니다" flash + 채팅 영역 빈 화면 flash → 복원
- **After**: 새로고침 → 블록 패널 flash 없이 즉시 유지 + 채팅 영역 스피너 → 복원
- 동영상은 이미 포트폴리오에 포함되어 있음 (수정 전/후 화면 비교)

## 커밋 정보

- 커밋: `e1a22ba refactor:채팅 레이아웃 CSR -> CSR + SSR 전환으로 초기로딩 제거`
- 변경 파일: layout.tsx, client-chat-layout.tsx(신규), get-user-blocks.ts(신규), use-blocks-init.ts, /api/blocks/route.ts

## 작성 규칙

- **분량**: 최대 3페이지
- **구조**: 문제 상황(제목) → 원인 → 해결 과정 → 결과
- **코드**: 핵심 코드만 포함 (layout.tsx, client-chat-layout.tsx 동기 주입 부분 필수)
- **mermaid**: 수정 전/후 비교 다이어그램 포함
- **톤**: 첫 번째 트러블슈팅(pivotIndex)과 동일한 포트폴리오 톤
- **금지**: chatState(loading/restoring/ready) 개념 사용 금지 (실제 구현 아님)
- **채팅 영역 스피너**: 결과에서 간략히 언급만, 깊이 다루지 않음
- **핵심 메시지**: CSR의 구조적 한계를 경험한 뒤 SSR 도입의 필요성을 판단하게 된 사례
