# BlockMind Project Plan

> **"AI의 사고 과정을 블록으로 조립하여 완벽한 맥락을 설계하다"**
>
> 이 문서는 BlockMind 프로젝트의 현재 상태, 목표, 그리고 향후 개발 로드맵을 정의하는 살아있는 문서입니다.

---

## 1. 현재 상황 분석 (Current Status)

*Last Updated: 2026-03-05*

### 기술 스택 (Tech Stack)


| 카테고리      | 기술                                                |
| --------- | ------------------------------------------------- |
| Framework | Next.js (App Router), TypeScript Strict           |
| UI        | Tailwind CSS v4, Shadcn UI (Radix UI 기반)          |
| State     | Zustand (`block-store`, `chat-store`, `ui-store`) |
| DnD       | @dnd-kit/core + @dnd-kit/sortable                 |
| AI        | Vercel AI SDK + Google Gemini 2.5 Flash           |
| Auth      | NextAuth.js v5 + Google OAuth (JWT 전략)            |
| DB        | Supabase PostgreSQL + Prisma 7                    |
| i18n      | next-intl v4 (URL 라우팅, localePrefix: as-needed)   |
| Markdown  | react-markdown + remark-gfm                       |


### 구현된 기능 (Completed)

#### 레이아웃 & UI

- **3-Column 레이아웃**: 좌(채팅 사이드바) | 중(채팅) | 우(블록 패널)
- 각 사이드바 접힘/펼침 토글 (상태 localStorage 저장, `ui-store`)
- 다크 테마 (채팅 페이지 전용)
- AI 메시지 UI: 아바타/이름/시간 없이 텍스트만 표시 (GPT 스타일)

#### 인증

- Google OAuth 로그인 (NextAuth.js v5, JWT 전략)
- 미들웨어로 `/chat` 라우트 보호

#### 채팅 세션 관리 (DB 연동 완료)

- 채팅 세션 자동 생성 (첫 메시지 전송 시, 제목 = 첫 메시지 40자)
- 세션 목록 조회, 세션 전환, 삭제
- 메시지 DB 저장 (fire-and-forget)
- ChatSidebar에서 세션 목록 표시 및 전환
- 페이지 복귀 시 활성 세션 메시지 자동 복원

#### 블록 시스템 (DB 연동 완료)

- 블록 타입: `data` (persona/rule/data 통합)
- AI가 대화 후 자동으로 블록 추출 (`/api/blocks/extract`, MAX_BLOCKS_PER_CYCLE=1)
- 블록 CRUD: DB 동기화 (Zustand + Supabase)
- Drag & Drop 재정렬 (`/api/blocks/reorder`)
- visibility toggle (켜진 블록만 시스템 프롬프트에 포함)
- 블록 삭제 확인 다이얼로그
- 블록 hover 시 액션 버튼 표시 (eye toggle, delete)
- 블록 너비 사이드바 내 고정 (`max-w-72`)

#### AI 채팅

- Gemini 스트리밍 응답 (`/api/chat`)
- 활성 블록 → 시스템 프롬프트 자동 주입 (`build-system-prompt.ts`)
- AI 답변 마크다운 렌더링
- 429 할당량 초과 에러 → UI 배너 표시
- 블록 visibility 변경 시 pivotIndex 기반 메시지 슬라이싱 (AI 컨텍스트 리셋)

#### 파일 업로드

- 입력창 `+` 버튼으로 이미지/PDF/파일 첨부
- Gemini multimodal 활용 (이미지, PDF 등)
- 파일 미리보기 모달
- Supabase Storage 연동, signed URL 만료 처리 (PDF 새로고침 버튼)
- 파일/이미지 정보 Zustand 관리

#### 다국어 (i18n)

- next-intl v4, URL 라우팅 방식 (`localePrefix: as-needed`)
- 지원 언어: ko(기본), en, zh, ja
- 한국어: `/chat`, 영어: `/en/chat`

### 현재 파일 구조 (Key Files)

```
src/
├── app/
│   ├── [locale]/
│   │   └── chat/page.tsx              # 3-Column 레이아웃
│   └── api/
│       ├── chat/route.ts              # Gemini 스트리밍, 시스템 프롬프트 주입
│       ├── blocks/
│       │   ├── route.ts               # GET(목록), POST(생성)
│       │   ├── [id]/route.ts          # PATCH(수정), DELETE(삭제)
│       │   ├── extract/route.ts       # 블록 자동 추출 (generateObject)
│       │   └── reorder/route.ts       # 순서 일괄 업데이트
│       └── sessions/
│           ├── route.ts               # GET(세션 목록), POST(생성)
│           ├── [id]/route.ts          # GET(메시지), PATCH(제목), DELETE
│           └── [id]/messages/route.ts # POST(메시지 저장)
├── components/
│   ├── chat/
│   │   ├── chat-interface.tsx         # useChat, onFinish에서 추출 호출
│   │   ├── chat-sidebar.tsx           # 세션 목록 (DB 연동)
│   │   ├── chat-message-list.tsx      # 메시지 렌더링
│   │   ├── chat-input-composer.tsx    # 입력창 + 파일 첨부
│   │   ├── file-attachment-preview.tsx # 첨부 파일 미리보기
│   │   ├── file-preview-modal.tsx     # 파일 상세 모달
│   │   └── message-content.tsx        # 마크다운 렌더링
│   └── block/
│       ├── block-list.tsx             # DnD 컨텍스트
│       ├── block-item.tsx             # 블록 카드 (drag, toggle, delete)
│       └── block-detail-dialog.tsx    # 블록 상세 (read-only)
├── store/
│   ├── block-store.ts                 # 블록 CRUD, reorder, pivotIndex
│   ├── chat-store.ts                  # sessionId, pendingMessages, mountKey
│   └── ui-store.ts                    # 사이드바 collapse (localStorage persist)
├── hooks/
│   └── use-blocks-init.ts             # 마운트 시 DB에서 블록 로드
├── lib/
│   ├── build-system-prompt.ts         # 활성 블록 → 시스템 프롬프트
│   └── slice-messages-by-reset.ts     # pivotIndex 기반 슬라이싱
└── types/
    └── block.ts                       # Block 타입 정의
prisma/
└── schema.prisma                      # User, ChatSession, Message, Block 모델
messages/
└── ko.json, en.json, zh.json, ja.json # i18n 번역 파일
```

---

## 2. 프로젝트 목표 (Project Goal)

**"사용자가 AI의 뇌 구조를 직접 눈으로 보고 손으로 만진다"**

BlockMind는 단순한 채팅앱이 아닙니다. LLM의 고질적인 문제인 **맥락 소실**과 **환각**을 해결하기 위한 도구입니다.

### 핵심 철학

1. **시각화**: AI가 현재 어떤 정보를 기억하고 있는지 우측 패널에 명시적으로 표시
2. **제어권**: 블록을 끄면 AI는 즉시 그 맥락을 잊고, 순서를 바꾸면 중요도가 달라짐
3. **자동화**: 블록은 AI가 대화 흐름을 분석해 자동으로 추출 (수동 추가 없음)

---

## 3. 남은 작업 (Remaining Tasks)

### [우선순위 높음]

#### 채팅 사이드바 고도화

- 대화 검색 기능 (현재 UI만 있음, 동작 없음)
- 세션 제목 인라인 수정
- 대화 핀(Pin) 기능 — DB 스키마(`isPinned` 컬럼) 추가 필요
- 폴더 관리 — DB 스키마 추가 필요

#### 블록 UX

- 블록 추가 시 애니메이션 (새 블록이 아래에서 슬라이드인)

#### 랜딩페이지

- 현재 랜딩페이지 내용 및 디자인 개선

#### LLM 비용 최적화

- 사용자 증가 대비 모델 전략 검토 (Gemini Flash → 더 저렴한 모델 티어 고려)
- 토큰 사용량 모니터링 / 블록 주입 시스템 프롬프트 길이 최적화

### [우선순위 중간]

- 토스트 알림 — 블록 저장/삭제 시 피드백 (`sonner`)
- 입력창 `Settings(⚙)` 버튼 기능 구현
- 블록 패널 헤더 `Settings(⚙)` 버튼 기능 구현

### [우선순위 낮음 / 미정]

- 모바일 대응 — 3-Column → 탭 형태 전환
- 블록 템플릿 — 자주 쓰는 블록 저장 및 불러오기
- Supabase RLS(Row Level Security) 정책 점검
- 프로덕션 배포 설정 (Vercel, 환경변수 정리)

### [계획 없음 (Not Planned)]

- ~~BlockDetailDialog 편집 기능~~ — read-only 유지
- ~~채팅 헤더~~ — 구현하지 않음

---

## 4. 개발 가이드라인 (Convention)

1. **단순함 우선**: 과도한 추상화보다 읽으면 바로 이해되는 직관적인 코드
2. **TypeScript**: `any` 타입 사용 금지, `src/types/`에 타입 명확히 정의
3. **컴포넌트 분리**: 200줄 초과 시 분리 고려
4. **블록 추가 방식**: 수동 추가 없음, AI 자동 추출만 지원
5. **DB 패턴**: UI는 Zustand로 즉각 반영, DB는 fire-and-forget (UX 우선)
6. **인증**:
  - `auth.config.ts`: Edge Runtime (Prisma 제외)
  - `auth.ts`: Node.js Runtime (Prisma 포함)
  - `middleware.ts`: `auth.config.ts`만 사용

---

## 5. API 엔드포인트 전체 목록


| 엔드포인트                         | 메서드    | 기능             |
| ----------------------------- | ------ | -------------- |
| `/api/chat`                   | POST   | Gemini 스트리밍 응답 |
| `/api/blocks`                 | GET    | 블록 목록 조회       |
| `/api/blocks`                 | POST   | 블록 생성          |
| `/api/blocks/[id]`            | PATCH  | 블록 수정          |
| `/api/blocks/[id]`            | DELETE | 블록 삭제          |
| `/api/blocks/extract`         | POST   | 블록 자동 추출       |
| `/api/blocks/reorder`         | PATCH  | 재정렬 일괄 업데이트    |
| `/api/sessions`               | GET    | 세션 목록          |
| `/api/sessions`               | POST   | 세션 생성          |
| `/api/sessions/[id]`          | GET    | 세션 메시지 로드      |
| `/api/sessions/[id]`          | PATCH  | 제목 수정          |
| `/api/sessions/[id]`          | DELETE | 세션 삭제          |
| `/api/sessions/[id]/messages` | POST   | 메시지 저장         |


