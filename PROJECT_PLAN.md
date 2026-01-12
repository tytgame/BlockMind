# 📋 BlockMind Project Plan

> **"AI의 사고 과정을 블록으로 조립하여 완벽한 맥락을 설계하다"**
>
> 이 문서는 BlockMind 프로젝트의 현재 상태, 목표, 그리고 향후 개발 로드맵을 정의하는 살아있는 문서입니다.

---

## 1. 🔍 현재 상황 분석 (Current Status)

### 🛠 기술 스택 (Tech Stack)
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript (Strict Mode)
- **UI Framework**: Tailwind CSS v4, Shadcn UI (Radix UI 기반)
- **State Management**: Zustand (Client-side global state)
- **Drag & Drop**: @dnd-kit/core (Sortable, Modifiers)
- **AI Integration**: Vercel AI SDK (`ai`), Google Gemini API
- **Database**: Supabase + Prisma (스키마 정의 완료, 연동 대기 중)

### 🧩 구현된 핵심 기능 (Implemented Features)
1. **Layout Architecture**: 
   - 좌측: AI 채팅 인터페이스 (`ChatInterface`)
   - 우측: 맥락 블록 대시보드 (`BlockList`)
   - 반응형 구조 (Flexbox 기반)
2. **Context Block System**:
   - 블록 타입: `persona`, `rule`, `data`, `output`
   - 기능: 블록 추가, 삭제, 내용 수정, 숨김/보임 토글
   - 인터랙션: 드래그 앤 드롭으로 순서 변경 (우선순위 조정)
3. **AI Chat & Automation**:
   - 실시간 채팅: Google Gemini 모델 연동
   - **Context Injection**: 우측 패널의 활성화된 블록들이 자동으로 System Prompt로 주입됨
   - **Tool Calling**: 대화 중 AI가 필요하다고 판단하면 스스로 블록을 생성 (`createBlock`)

### 📂 현재 파일 구조 (Key Files)
```
src/
├── app/
│   ├── api/chat/route.ts    # AI 통신 및 툴 호출 로직 (Backend)
│   ├── page.tsx             # 메인 화면 (좌우 분할 레이아웃)
├── components/
│   ├── block/               # 블록 관련 UI (List, Item)
│   ├── chat/                # 채팅 관련 UI
│   └── ui/                  # Shadcn UI 기본 컴포넌트
├── lib/
│   └── supabase/            # DB 연결 유틸리티
├── store/
│   └── block-store.ts       # 전역 상태 관리 (Zustand)
└── types/
    └── block.ts             # 데이터 타입 정의
prisma/
└── schema.prisma            # 데이터베이스 모델링
```

---

## 2. 🎯 프로젝트 목표 (Project Goal)

**"사용자가 AI의 뇌 구조를 직접 눈으로 보고 손으로 만진다"**

BlockMind는 단순한 채팅앱이 아닙니다. LLM(거대언어모델)이 겪는 고질적인 문제인 **"맥락 소실(Context Loss)"**과 **"환각(Hallucination)"**을 해결하기 위한 도구입니다.

### 핵심 철학
1. **시각화 (Visualization)**: AI가 현재 어떤 페르소나와 규칙을 따르고 있는지 우측 패널에 명시적으로 보여준다.
2. **제어권 (Control)**: 사용자가 블록을 끄면(`isVisible: false`), AI는 즉시 그 맥락을 잊어야 한다. 순서를 바꾸면 중요도가 달라져야 한다.
3. **직관성 (Simplicity)**: 복잡한 프롬프트 엔지니어링 없이, 레고 블록을 쌓듯 맥락을 조립한다.

---

## 3. 🛣️ 향후 개발 로드맵 (Roadmap)

비전공자 초보 개발자도 쉽게 따라갈 수 있도록 단계별로 구성했습니다.

### [Phase 1: 데이터 영속성 (Persistence)] - **현재 단계**
> **목표**: 새로고침해도 블록과 채팅 내역이 사라지지 않게 한다.

- [ ] **Supabase Auth 연동**
  - 로그인/회원가입 페이지 구현 (`/login`)
  - Google 소셜 로그인 설정
  - 미들웨어(`middleware.ts`)로 보호된 라우트 설정
- [ ] **DB 데이터 동기화**
  - Zustand 스토어 수정: 로컬 상태가 변경될 때마다 DB에 자동 저장 (Sync Logic)
  - 채팅 기록(`ChatSession`, `Message`) 저장 로직 구현
  - 사이드바 추가: 과거 채팅/블록 세션 불러오기 기능

### [Phase 2: UX 고도화 (Refining Experience)]
> **목표**: 사용자가 더 편하게 느끼도록 디테일을 잡는다.

- [ ] **블록 템플릿 기능**
  - 자주 쓰는 블록(예: "시니어 개발자 페르소나", "마크다운 출력 규칙") 저장 및 불러오기
- [ ] **모바일 대응**
  - 2-Column 레이아웃을 탭(Tab) 형태로 변환 (Chat <-> Blocks)
- [ ] **토스트 알림 (Toast Notifications)**
  - 블록 생성/삭제/저장 시 피드백 제공 (`sonner` 라이브러리 활용)

### [Phase 3: AI 기능 확장 (AI Capabilities)]
> **목표**: AI가 더 똑똑하게 블록을 다루게 한다.

- [ ] **블록 자동 수정 (Update Block)**
  - 현재는 생성(`createBlock`)만 가능하지만, 대화 흐름에 따라 AI가 기존 블록 내용을 수정하거나 삭제하도록 툴 확장
- [ ] **맥락 추천 시스템**
  - "이 대화에서는 'Python 전문가' 페르소나가 필요해 보입니다. 추가할까요?" 제안 기능

---

## 4. 💡 개발 가이드라인 (Convention)

1. **복잡함 피하기 (Keep it Simple)**
   - 과도한 추상화나 디자인 패턴보다는, 코드를 읽었을 때 흐름이 바로 보이는 "직관적인 코드"를 작성한다.
   - 예: 복잡한 HOC(Higher Order Component) 대신 단순한 Hook 사용.

2. **타입스크립트 활용 (TypeScript)**
   - `any` 타입 사용 지양.
   - `src/types/` 폴더에 인터페이스를 명확히 정의하고 시작한다.

3. **컴포넌트 분리 기준**
   - 파일 하나가 200줄이 넘어가면 분리를 고려한다.
   - 재사용되는 UI는 `components/ui`에, 로직이 포함된 큰 덩어리는 `components/도메인`에 둔다.

---
*Last Updated: 2026-01-10*
