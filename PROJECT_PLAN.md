#  BlockMind Project Plan

> **"AI의 사고 과정을 블록으로 조립하여 완벽한 맥락을 설계하다"**
>
> 이 문서는 BlockMind 프로젝트의 현재 상태, 목표, 그리고 향후 개발 로드맵을 정의하는 살아있는 문서입니다.

---

## 1.  현재 상황 분석 (Current Status)

### 🛠 기술 스택 (Tech Stack)
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript (Strict Mode)
- **UI Framework**: Tailwind CSS v4, Shadcn UI (Radix UI 기반)
- **State Management**: Zustand (Client-side global state)
- **Drag & Drop**: @dnd-kit/core (Sortable, Modifiers)
- **AI Integration**: Vercel AI SDK (`ai`), Google Gemini API
- **Authentication**: NextAuth.js v5 (Auth.js) + Google OAuth
- **Database**: Supabase PostgreSQL + Prisma 7 (Adapter 패턴)

###  구현된 핵심 기능 (Implemented Features)
1. **Landing Page** (`/`):
   - 브랜드 소개 및 기능 설명 (Hero, Features, Integration 섹션)
   - 채팅 UI 데모 섹션
   - 네비게이션 바 및 푸터 (BlockMind 로고, Sora 폰트)
   - "Start Chatting Free" 버튼 → `/chat`으로 라우팅
2. **Authentication** (`/login`):
   - Google 소셜 로그인 (NextAuth.js v5)
   - JWT 세션 전략 (Edge Runtime 호환)
   - 로그인 페이지 UI (다크 테마)
   - 미들웨어로 보호된 라우트 (`/chat`)
3. **Chat App Layout** (`/chat`):
   - 좌측: AI 채팅 인터페이스 (`ChatInterface`)
   - 우측: 맥락 블록 대시보드 (`BlockList`)
   - 풀스크린 레이아웃 (채팅 전용)
   - 로그인 필수 (비로그인 시 `/login`으로 리다이렉트)
4. **Context Block System**:
   - 블록 타입: `persona`, `rule`, `data`, `output`
   - 기능: 블록 추가, 삭제, 내용 수정, 숨김/보임 토글
   - 인터랙션: 드래그 앤 드롭으로 순서 변경 (우선순위 조정)
5. **AI Chat & Automation**:
   - 실시간 채팅: Google Gemini 모델 연동
   - **Context Injection**: 우측 패널의 활성화된 블록들이 자동으로 System Prompt로 주입됨
   - **Tool Calling**: 대화 중 AI가 필요하다고 판단하면 스스로 블록을 생성 (`createBlock`)

### 현재 파일 구조 (Key Files)
```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth API 라우트
│   │   └── chat/route.ts                # AI 통신 및 툴 호출 로직
│   ├── chat/
│   │   ├── layout.tsx                   # 채팅 앱 전용 레이아웃
│   │   └── page.tsx                     # /chat - 채팅 + 블록 2-Column 화면
│   ├── login/
│   │   └── page.tsx                     # /login - 로그인 페이지
│   ├── layout.tsx                       # 루트 레이아웃 (SessionProvider)
│   └── page.tsx                         # / - 랜딩 페이지
├── components/
│   ├── block/                           # 블록 도메인 UI
│   │   ├── block-item.tsx
│   │   └── block-list.tsx
│   ├── chat/                            # 채팅 도메인 UI
│   │   └── chat-interface.tsx
│   ├── landing/                         # 랜딩 페이지 섹션들
│   │   ├── hero-section.tsx
│   │   ├── demo-section.tsx
│   │   ├── features-section.tsx
│   │   ├── integration-section.tsx
│   │   └── footer.tsx
│   ├── layout/                          # 공통 레이아웃 컴포넌트
│   │   └── navbar.tsx                   # (로그인 상태 반영)
│   ├── providers/
│   │   └── session-provider.tsx         # NextAuth SessionProvider
│   └── ui/                              # Shadcn UI 기본 컴포넌트
├── lib/
│   ├── prisma.ts                        # Prisma 7 클라이언트 (Adapter 패턴)
│   ├── supabase/                        # (레거시 - 향후 정리)
│   └── utils.ts                         # 일반 유틸리티
├── store/
│   ├── block-store.ts                   # 블록 상태 관리 (Zustand)
│   └── chat-store.ts                    # 채팅 상태 관리 (Zustand)
├── types/
│   └── block.ts                         # 데이터 타입 정의
├── auth.ts                              # NextAuth 설정 (Node.js Runtime)
├── auth.config.ts                       # NextAuth 설정 (Edge Runtime)
└── middleware.ts                        # 라우트 보호 미들웨어
prisma/
├── schema.prisma                        # DB 모델 (User, Account, Session, Block 등)
└── prisma.config.ts                     # Prisma 7 설정
```

---

## 2. 프로젝트 목표 (Project Goal)

**"사용자가 AI의 뇌 구조를 직접 눈으로 보고 손으로 만진다"**

BlockMind는 단순한 채팅앱이 아닙니다. LLM(거대언어모델)이 겪는 고질적인 문제인 **"맥락 소실(Context Loss)"**과 **"환각(Hallucination)"**을 해결하기 위한 도구입니다.

### 핵심 철학
1. **시각화 (Visualization)**: AI가 현재 어떤 페르소나와 규칙을 따르고 있는지 우측 패널에 명시적으로 보여준다.
2. **제어권 (Control)**: 사용자가 블록을 끄면(`isVisible: false`), AI는 즉시 그 맥락을 잊어야 한다. 순서를 바꾸면 중요도가 달라져야 한다.
3. **직관성 (Simplicity)**: 복잡한 프롬프트 엔지니어링 없이, 레고 블록을 쌓듯 맥락을 조립한다.

---

## 3. 향후 개발 로드맵 (Roadmap)

비전공자 초보 개발자도 쉽게 따라갈 수 있도록 단계별로 구성했습니다.

### [Phase 1: 데이터 영속성 (Persistence)] - **진행 중**
> **목표**: 새로고침해도 블록과 채팅 내역이 사라지지 않게 한다.

- [x] **인증 시스템 구현**
  - [x] NextAuth.js v5 설정 (Google OAuth)
  - [x] 로그인 페이지 구현 (`/login`)
  - [x] JWT 세션 전략 (Edge Runtime 호환)
  - [x] 미들웨어로 보호된 라우트 설정 (`/chat`)
  - [x] Navbar 로그인/로그아웃 UI
- [x] **Prisma 7 + Supabase PostgreSQL 연동**
  - [x] Prisma Adapter 패턴 설정
  - [x] User, Account, Session 모델 정의
  - [x] DB 마이그레이션 완료
- [ ] **DB 데이터 동기화** ← 다음 단계
  - [ ] Zustand 스토어 수정: 로컬 상태가 변경될 때마다 DB에 자동 저장
  - [ ] 채팅 기록(`ChatSession`, `Message`) 저장 로직 구현
  - [ ] 블록(`Block`) 저장 로직 구현
  - [ ] 사이드바 추가: 과거 채팅/블록 세션 불러오기 기능

### [Phase 1.5: UI 리뉴얼 (UI Renewal)] - **진행 중**
> **목표**: 프로덕션 수준의 채팅 앱 UI/UX 구현

- [x] **3-Column 레이아웃 구현**
  - [x] 왼쪽: 대화 목록 사이드바 (`ChatSidebar`)
  - [x] 중앙: AI 채팅 인터페이스 (`ChatInterface`)
  - [x] 오른쪽: 맥락 블록 패널 (`BlockList`)
- [x] **다크 테마 적용**
  - [x] 채팅 페이지 전용 다크 모드 강제 적용
  - [ ] 라이트/다크 토글 기능 (Phase 2)
- [x] **대화 목록 사이드바 UI**
  - [x] BlockMind 로고 + 워크스페이스 표시
  - [x] "+ New Chat" 버튼
  - [x] 검색창 (UI만)
  - [x] RECENTS / PINNED / FOLDERS 섹션 (UI만)
  - [x] Settings 버튼 + 사용자 프로필
  - [ ] 대화 저장/불러오기 기능 연동 (Phase 1 - DB 동기화 후)
  - [ ] 대화 고정(Pin) 기능
  - [ ] 폴더 관리 기능
- [x] **채팅 헤더 리뉴얼**
  - [x] 대화 제목 + Active Session 표시
  - [x] 버전 토글 (Free / Pro API)
  - [x] 공유/다운로드 아이콘 (UI만)
  - [ ] Free 모드: 서버 API 키 사용
  - [ ] Pro 모드: 사용자 API 키 입력 (BYOK)
- [x] **메시지 UI 개선**
  - [x] 사용자 메시지: 파란색 버블 + 아바타
  - [x] AI 메시지: 카드형 + "BlockMind" 이름 + 시간
  - [ ] 마크다운 렌더링 (코드 블록 하이라이팅)
- [x] **메시지 입력창 개선**
  - [x] 플레이스홀더 "Message BlockMind..."
  - [x] 추가 기능 아이콘 (+, 이미지, 마이크) - UI만
  - [x] 하단 경고 문구
  - [ ] 파일 첨부 기능
  - [ ] 음성 입력 기능
- [x] **Context Blocks 패널 리뉴얼**
  - [x] "ACTIVE MEMORY" 섹션 라벨
  - [x] 블록 카드: 왼쪽 색상 바 + 제목 + 설명
  - [x] 설정 아이콘 (UI만)
  - [x] "+ Add Context Block" 버튼 하단 이동

### [Phase 2: UX 고도화 (Refining Experience)]
> **목표**: 사용자가 더 편하게 느끼도록 디테일을 잡는다.

- [ ] **블록 템플릿 기능**
  - 자주 쓰는 블록(예: "시니어 개발자 페르소나", "마크다운 출력 규칙") 저장 및 불러오기
- [ ] **모바일 대응**
  - 3-Column 레이아웃을 탭(Tab) 형태로 변환 (Sidebar <-> Chat <-> Blocks)
- [ ] **토스트 알림 (Toast Notifications)**
  - 블록 생성/삭제/저장 시 피드백 제공 (`sonner` 라이브러리 활용)
- [ ] **라이트/다크 테마 토글**
  - 시스템 설정 연동 또는 수동 전환

### [Phase 3: AI 기능 확장 (AI Capabilities)]
> **목표**: AI가 더 똑똑하게 블록을 다루게 한다.

- [ ] **블록 자동 수정 (Update Block)**
  - 현재는 생성(`createBlock`)만 가능하지만, 대화 흐름에 따라 AI가 기존 블록 내용을 수정하거나 삭제하도록 툴 확장
- [ ] **맥락 추천 시스템**
  - "이 대화에서는 'Python 전문가' 페르소나가 필요해 보입니다. 추가할까요?" 제안 기능

---

## 4. 개발 가이드라인 (Convention)

1. **복잡함 피하기 (Keep it Simple)**
   - 과도한 추상화나 디자인 패턴보다는, 코드를 읽었을 때 흐름이 바로 보이는 "직관적인 코드"를 작성한다.
   - 예: 복잡한 HOC(Higher Order Component) 대신 단순한 Hook 사용.

2. **타입스크립트 활용 (TypeScript)**
   - `any` 타입 사용 지양.
   - `src/types/` 폴더에 인터페이스를 명확히 정의하고 시작한다.

3. **컴포넌트 분리 기준**
   - 파일 하나가 200줄이 넘어가면 분리를 고려한다.
   - 재사용되는 UI는 `components/ui`에, 로직이 포함된 큰 덩어리는 `components/도메인`에 둔다.

4. **인증 아키텍처 (NextAuth v5)**
   - `auth.config.ts`: Edge Runtime용 설정 (Prisma 제외)
   - `auth.ts`: Node.js Runtime용 설정 (Prisma 포함)
   - `middleware.ts`: `auth.config.ts`만 사용

---
*Last Updated: 2026-01-15*
