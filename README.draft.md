# BlockMind

> 사용자가 AI의 활성 문맥을 블록으로 보고 직접 조정하는 컨텍스트 중심 인터페이스

BlockMind는 단순히 메시지를 주고받는 채팅 화면이 아니라, AI가 답변할 때 참고하는 지속 맥락을 블록 단위로 드러내고 제어할 수 있게 만든 제품이다.  
왼쪽에는 세션, 가운데에는 대화, 오른쪽에는 현재 활성화된 컨텍스트 블록을 배치해 "지금 무엇을 기준으로 답하고 있는가"를 UI에서 직접 확인할 수 있다.

## Overview

- 3열 레이아웃으로 세션, 대화, 컨텍스트 블록을 동시에 보여준다.
- 대화가 끝나면 durable context를 자동으로 추출해 블록으로 저장한다.
- 사용자는 블록의 visibility와 순서를 조정해 AI가 참고하는 활성 문맥을 바꿀 수 있다.
- 이미지, PDF, DOCX 첨부를 지원하며, 파일은 블록과 세션 흐름에 연결된다.
- 채팅은 스트리밍으로 응답하고, 세션 전환과 새로고침 후에도 현재 세션을 복원한다.

## Why BlockMind

대부분의 AI 채팅 인터페이스에서 컨텍스트는 보이지 않는다. 사용자는 왜 그런 답이 나왔는지, 무엇이 계속 기억되고 있는지, 어떤 기준이 현재 응답에 반영되는지 확인하기 어렵다.

BlockMind는 이 문제를 UI 레벨에서 다룬다.

- 보이지 않는 문맥을 블록으로 시각화한다.
- 블록의 활성화/비활성화와 순서 변경으로 사용자가 기준을 직접 조정한다.
- 지속될 만한 정보는 대화 이후 자동 추출해 블록으로 쌓는다.

결과적으로 BlockMind는 "AI와 대화하는 화면"보다 "AI가 어떤 문맥을 들고 답하고 있는지를 제어하는 화면"에 가깝다.

## Core Features

- **3-column chat layout**: 좌측 세션 목록, 중앙 채팅, 우측 블록 패널로 구성된 작업 화면.
- **세션 관리**: 첫 메시지 시 세션 생성, 세션 목록 조회, pin/unpin, 전환, 삭제, 새로고침 후 현재 세션 복원.
- **자동 블록 추출**: 사용자 메시지와 AI 응답을 기준으로 durable block을 자동 생성. 현재 구현은 한 대화 사이클당 최대 1개까지 저장한다.
- **활성 문맥 제어**: 블록 visibility toggle과 drag-and-drop reorder를 지원한다.
- **실제 prompt 반영**: `isVisible=true`인 블록만 system prompt에 포함된다.
- **스트리밍 채팅 UX**: Gemini 기반 스트리밍 응답, Markdown/GFM 렌더링, 메시지 복사 버튼.
- **파일 첨부 흐름**: 이미지, PDF, DOCX 업로드 지원. 이미지 preview, PDF 다운로드/재업로드, DOCX 텍스트 추출 포함.
- **다국어 UI**: `ko`, `en`, `zh`, `ja` 로케일 지원.
- **인증**: Google OAuth와 이메일 OTP 로그인 둘 다 지원.

## Tech Stack

- **Frontend**: Next.js App Router, React, TypeScript strict
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI, Lucide Icons
- **State**: Zustand
- **Interaction**: `@dnd-kit` for block reorder
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`), Google Gemini 2.5 Flash
- **Auth**: NextAuth.js v5 beta, Google OAuth, Credentials OTP, Prisma Adapter
- **Database**: Prisma + PostgreSQL
- **Storage**: Supabase Storage signed upload/download flow
- **Document Handling**: Mammoth for DOCX text extraction, browser-image-compression for image compression
- **i18n**: next-intl
- **Testing**: Jest + ts-jest

## Project Structure

```text
.
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ messages/
│  ├─ ko.json
│  ├─ en.json
│  ├─ zh.json
│  └─ ja.json
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ page.tsx
│  │  │  ├─ login/
│  │  │  └─ chat/
│  │  └─ api/
│  │     ├─ auth/
│  │     ├─ chat/
│  │     ├─ sessions/
│  │     ├─ blocks/
│  │     ├─ files/
│  │     └─ upload/
│  ├─ components/
│  │  ├─ chat/
│  │  ├─ block/
│  │  ├─ landing/
│  │  ├─ layout/
│  │  ├─ providers/
│  │  └─ ui/
│  ├─ hooks/
│  ├─ i18n/
│  ├─ lib/
│  ├─ store/
│  ├─ types/
│  └─ __tests__/
├─ package.json
└─ README.md
```

## How It Works

1. 사용자가 채팅을 시작하면 세션이 생성되고, 메시지는 세션 단위로 저장된다.
2. AI 응답이 끝나면 최근 user/assistant 대화를 기준으로 durable context를 추출해 블록으로 저장한다.
3. 저장된 블록은 우측 패널에 쌓이고, 사용자는 각 블록을 보거나 숨기고, 순서를 바꾸고, 필요 없으면 삭제할 수 있다.
4. 실제 AI 호출에는 visible block만 system prompt로 직렬화되어 전달된다.
5. 블록 visibility가 바뀌거나 블록이 삭제되면 앱은 그 시점을 reset point로 기록하고, 이후 요청부터는 그 변경 이후 메시지만 AI에 전달한다.
6. 파일이 첨부된 경우 이미지/PDF/DOCX 메타데이터가 메시지 및 블록 흐름에 연결된다. PDF는 Gemini Files API URI와 만료시각을 추적하고, DOCX는 텍스트를 추출해 사용한다.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

현재 저장소에는 `.env.example`가 없다. 아래 변수들을 기준으로 `.env.local` 또는 실행 환경 변수를 직접 구성해야 한다.

실행 전 준비할 외부 리소스는 다음과 같다.

- PostgreSQL 데이터베이스
- Supabase 프로젝트와 Storage bucket `blockmind-files`
- Google OAuth 클라이언트
- Gemini API 사용 환경
- 이메일 OTP를 실제 메일로 보내려면 Resend 설정

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the development server

```bash
npm run dev
```

개발 서버가 실행되면 브라우저에서 `http://localhost:3000`을 열면 된다.

### Optional commands

```bash
npm test
npm run build
npm start
```

## Environment Variables

코드에서 직접 확인되는 환경변수는 아래와 같다.

| Name | Used For |
| --- | --- |
| `DATABASE_URL` | Prisma/PostgreSQL 연결 |
| `GOOGLE_CLIENT_ID` | Google OAuth provider 설정 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth provider 설정 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser/server helper client |
| `SUPABASE_SERVICE_ROLE_KEY` | signed upload/download URL 발급, Storage 관리 작업 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | PDF를 Gemini Files API에 업로드하거나 refresh할 때 사용 |
| `RESEND_API_KEY` | 이메일 OTP 발송. 없으면 개발용 콘솔 fallback 사용 |
| `EMAIL_FROM` | OTP 발신 주소. 없으면 기본값 사용 |
| `NEXTAUTH_URL` | PDF refresh 경로에서 내부 API base URL로 사용. 없으면 `http://localhost:3000` fallback |

Supabase Storage bucket 이름은 코드 기준으로 `blockmind-files`다.

## Current Status

- 핵심 컨텍스트 블록 흐름은 end-to-end로 구현되어 있다.
- 채팅, 세션 저장/복원, 자동 블록 추출, visibility/reorder, 파일 첨부, 인증, 다국어 UI가 연결되어 있다.
- 단위 테스트는 현재 `10 suites / 171 tests` 기준으로 통과한다.
- 블록 생성은 현재 자동 추출 중심이며, UI에 별도 수동 생성/편집 화면은 노출되어 있지 않다.
- 일부 랜딩 링크와 일부 설정성 UI는 placeholder 수준이다. README에서는 실제 동작 범위만 문서화하는 것이 맞다.

## Demo / Screenshot

> Placeholder
>
> 이 섹션에는 아래와 같은 실제 화면 캡처 또는 GIF를 추가하면 좋다.
>
> - 3열 채팅 화면 전체
> - 블록 visibility toggle 장면
> - 블록 reorder 장면
> - 이미지/PDF/DOCX 첨부 예시

## License

현재 저장소에는 `LICENSE` 파일이 없다.

## 메모: 추가로 다듬으면 좋은 부분

- 실제 채팅 화면과 블록 패널 스크린샷 또는 GIF를 추가해 첫 인상을 강화하기
- `.env.example`를 제공해 로컬 실행 진입장벽 낮추기
- placeholder 상태인 search/settings/docs/pricing 링크를 문서와 UI에서 명확히 정리하기
- 블록의 자동 생성 중심 UX를 한 장의 다이어그램으로 설명하기
- 라이선스 정책이 정해졌다면 `LICENSE` 파일과 README 섹션을 함께 확정하기
