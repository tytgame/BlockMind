# BlockMind 프로젝트 컨텍스트

이 문서는 포트폴리오 작성 시 BlockMind 프로젝트의 맥락을 제공하기 위한 참고 자료입니다.

---

## 프로젝트 개요

- **서비스명**: BlockMind
- **한줄 소개**: AI 대화 맥락 관리 서비스
- **사이트**: blockmind.kr
- **GitHub**: github.com/tytgame/BlockMind
- **유형**: 개인 프로젝트
- **기간**: 2026.01 — 2026.03
- **이력서 설명**: AI 대화에서 어떤 컨텍스트가 답변에 반영되는지 시각화하고 제어할 수 있는 서비스

### 핵심 개념

사용자가 AI의 "맥락 블록(Context Block)"을 시각적으로 관리한다.
- 블록(data/image/file)이 시스템 프롬프트로 자동 주입됨
- AI가 대화 후 자동으로 블록을 추출/생성함 (generateObject, max 1 block/cycle)
- 블록의 활성화/비활성화로 AI가 참조하는 컨텍스트를 즉시 제어

### 3-Column 레이아웃

```
[ Chat Sidebar ] [ Chat Interface ] [ Block Panel ]
   세션 목록         AI 채팅          블록 관리
   핀/삭제         스트리밍          DnD 재정렬
   검색            마크다운          활성/비활성
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router), React 19, TypeScript Strict |
| Styling | Tailwind CSS v4, Shadcn UI |
| State | Zustand (block-store, chat-store, ui-store) |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| AI | Vercel AI SDK + Google Gemini 2.5 Flash |
| Auth | NextAuth.js v5 + Google OAuth + Email OTP (Resend) |
| DB | Supabase PostgreSQL + Prisma 7 |
| Storage | Supabase Storage (이미지, PDF, 파일) |
| i18n | next-intl v4 (ko/en/zh/ja) |
| Test | Jest (176 unit tests), Playwright (4 E2E tests) |
| Deploy | Vercel (auto deploy), blockmind.kr 커스텀 도메인 |

---

## 아키텍처 요약

### 렌더링 구조 (CSR + SSR 하이브리드)

```
Server Component (layout.tsx)
  ├── auth() → 세션 확인
  ├── getUserBlocks() → DB에서 블록 조회
  └── initialBlocks를 props로 전달
        ↓
Client Component (client-chat-layout.tsx)
  ├── Zustand store에 initialBlocks 동기 주입
  ├── ChatSidebar (세션 목록)
  ├── ChatInterface (AI 채팅, useChat hook)
  └── BlockList (블록 패널, DnD)
```

- 원래 100% CSR이었으나, 초기 로딩 시 블록 패널에 빈 상태 flash 발생
- layout.tsx를 Server Component로 전환하여 첫 프레임부터 데이터 표시

### 요청 흐름

- 페이지 요청: Browser → Middleware (NextAuth + next-intl) → Server Component
- API 요청: Browser → API Routes 직접 (미들웨어 안 거침, 각 route에서 auth() 호출)

### 블록 → AI 주입 파이프라인

```
blocks.filter(isVisible) → buildSystemPrompt() → POST /api/chat body.systemMempt
                                                     + messages (pivotIndex로 슬라이싱)
                                                     ↓
                                                  Gemini 2.5 Flash → streaming response
```

### 블록 자동 추출

```
AI 응답 완료 (onFinish)
  → POST /api/blocks/extract
  → Gemini generateObject() (Zod schema, max 1 block)
  → DB INSERT + Zustand appendBlock()
  → toast 알림
```

---

## 포트폴리오 3개 항목

이력서의 BlockMind bullet 3개에 대응하는 포트폴리오 상세 문서를 작성 중입니다.

### 1. UI 상태와 API 요청 데이터 간 불일치를 상태 구조 재설계로 해결 (트러블슈팅)

**문제**: 블록을 비활성화해도 AI가 이전 대화 내용을 기억하여 답변함
**원인**: systemPrompt에는 블록 제거가 반영됐지만, messages[]는 과거 대화를 그대로 전송
**해결**: pivotIndex 기반 메시지 슬라이싱으로 display history와 inference history를 분리

핵심 구현:
- `pivotIndex`: 블록 토글 시점의 messages.length를 Zustand에 저장
- `sliceMessagesByReset()`: pivotIndex 이후 메시지만 API에 전달
- `lastResetAt` → `useEffect` → `setPivotIndex`: 렌더 완료 후 경계 캡처
- `transport body()`에서 `getState()`로 request-time snapshot (stale closure 방지)
- E2E 테스트: 실제 Gemini API + 패턴 매칭으로 블록 토글 → 응답 변화 검증

대안 검토:
- A. "잊어라" 프롬프트 지시 → 비결정적, 보장 불가
- B. 전체 채팅 삭제 → display/inference 분리 불가, 사용자 대화 파괴
- C. 두 가지 모드 제공 → 사용자에게 설계 실패를 떠넘김
- **D. pivotIndex 기반 메시지 슬라이싱** → 채택 (non-destructive reset)

### 2. CSR 구조의 초기 로딩 flash를 Server Component 도입으로 제거 (트러블슈팅)

**문제**: /chat 진입 시 블록 패널에 "블록이 없습니다"가 100~500ms 노출 후 블록 표시
**원인**: layout.tsx가 'use client'로 100% CSR → blocks: []로 시작 → useEffect fetch 동안 빈 상태 렌더
**해결**: 2단계에 걸쳐 개선

1차 수정 (CSR 내 개선):
- `chatState` (`loading | restoring | ready`) 도입
- "로딩 중"과 "데이터 없음" 구분 → 스피너로 빈 화면 방어
- 한계: 블록 패널은 여전히 useEffect fetch 의존 → flash 남음

2차 수정 (SSR 도입):
- layout.tsx → async Server Component 전환
- 서버에서 auth() + getUserBlocks() 호출
- initialBlocks를 props로 클라이언트에 전달 → Zustand에 동기 주입
- client-chat-layout.tsx 분리 (UI 인터랙션 담당)
- use-blocks-init.ts에 skip 파라미터 추가 (서버 데이터 있으면 fetch 건너뜀)

결과: 첫 프레임부터 블록 표시, 네트워크 요청 2회→1회, 레이아웃 시프트 제거

### 3. LLM API 호출 2회→1회로 통합하여 비용 50% 절감 (기술적 의사결정)

(아직 미작성 — 코드 수정 후 작성 예정)

---

## 주요 파일 경로

| 파일 | 역할 |
|------|------|
| `src/app/[locale]/chat/layout.tsx` | Server Component, SSR 데이터 주입 |
| `src/app/[locale]/chat/page.tsx` | 채팅 페이지, chatState 상태 관리 |
| `src/app/api/chat/route.ts` | Gemini 스트리밍, pivotIndex 슬라이싱 |
| `src/app/api/blocks/extract/route.ts` | 대화 후 블록 자동 추출 |
| `src/components/chat/client-chat-layout.tsx` | 3-Column 클라이언트 레이아웃 |
| `src/components/chat/chat-interface.tsx` | useChat hook, transport body() |
| `src/components/chat/chat-sidebar.tsx` | 세션 목록, 핀/삭제 |
| `src/components/block/block-list.tsx` | DnD 컨텍스트, 블록 렌더링 |
| `src/components/block/block-item.tsx` | 블록 카드, visibility toggle + rollback |
| `src/store/block-store.ts` | blocks, pivotIndex, lastResetAt |
| `src/store/chat-store.ts` | sessionId, pendingMessages, mountKey |
| `src/lib/slice-messages-by-reset.ts` | pivotIndex 기반 메시지 슬라이싱 |
| `src/lib/build-system-prompt.ts` | 활성 블록 → 시스템 프롬프트 |
| `src/lib/get-user-blocks.ts` | Server Component용 블록 조회 |
| `src/hooks/use-blocks-init.ts` | 클라이언트 fallback 블록 로드 |
| `e2e/block-visibility-reset.spec.ts` | 블록 토글 → 컨텍스트 리셋 E2E |

---

## 작성자 정보

- 이름: 유예성
- 포지션: Frontend Developer (신입~주니어)
- 한국어로 소통
- 문체: 포트폴리오는 '습니다'체
- 과도한 추상화 지양, 직관적 코드 선호
