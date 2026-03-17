# BlockMind

<p align="center">
  <img src="public/newTextLogo.png" alt="BlockMind Logo" width="600" />
</p>

> AI가 지금 무엇을 기준으로 답하고 있는지 확인하고 맥락을 관리하는 AI 채팅 서비스

![Next.js](https://img.shields.io/badge/Next.js_16.1-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white)

---

## 서비스 소개

대부분의 AI 채팅 인터페이스에서 **컨텍스트는 보이지 않습니다.** 사용자는 왜 그런 답이 나왔는지, 무엇이 계속 기억되고 있는지, 어떤 기준이 현재 응답에 반영되는지 확인하기 어렵습니다.

BlockMind는 이 문제를 UI 레벨에서 다룹니다.

- 보이지 않는 문맥을 **블록(Block)** 으로 시각화합니다.
- 블록의 활성화/비활성화와 순서 변경으로 사용자가 AI 기준을 직접 조정합니다.
- 지속될 만한 정보는 대화 이후 **자동으로 추출해 블록으로 쌓습니다.**



## 주요 기능

| 기능 | 설명 |
|------|------|
| **자동 블록 추출** | AI 응답 완료 후 주요 정보를 자동으로 추출해 블록으로 저장 |
| **블록 활성** | 블록 적용 토글, 블록 순서 조정 |
| **파일 첨부** | 이미지, PDF, DOCX 업로드 지원. 파일이 메시지와 블록에 연결 |
| **맥락 리셋** | 블록 비활성화 시 해당 블록 정보는 AI 메모리에서 제외 |
| **다국어 지원** | 한국어, 영어, 중국어, 일본어 |
| **인증** | Google OAuth + 이메일 OTP 로그인 |

---

## 기술 스택

### Frontend
- **Framework**: Next.js 16 App Router, React, TypeScript (strict)
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI, Lucide Icons
- **State**: Zustand
- **DnD**: @dnd-kit/core, @dnd-kit/sortable

### Backend & AI
- **AI**: Vercel AI SDK + LLM API
- **Auth**: NextAuth.js v5, Google OAuth, Credentials (Email OTP)
- **Database**: Prisma 7 + PostgreSQL (Supabase)
- **Storage**: Supabase Storage (signed URL 방식)
- **File Processing**: Mammoth (DOCX 텍스트 추출), Files API (PDF)

### Infra & 기타
- **i18n**: next-intl v4 (URL 기반 라우팅)
- **Email**: Resend
- **Testing**: Jest + ts-jest (단위 테스트 176개), Playwright (E2E 2건)

---

## 아키텍처 개요

```
사용자 메시지 전송
    │
    ├─ /api/chat       → 활성 블록을 system prompt로 직렬화 → Gemini 스트리밍
    │
AI 응답 완료
    │
    ├─ /api/sessions   → 세션 생성 (신규인 경우)
    ├─ /api/sessions/[id]/messages → user/assistant 메시지 저장
    └─ /api/blocks/extract → 대화에서 durable context 추출 → /api/blocks POST
                                                              (블록 패널에 자동 추가)
```

블록의 `isVisible` 상태와 `order`가 system prompt 구성에 직접 반영됩니다. 블록이 비활성화되거나 삭제된 시점은 `pivotIndex`로 기록되어, 이후 AI 호출에서 그 이전 대화는 제외됩니다.

---


## 실행 방법

### 사전 준비

- Node.js 20+
- PostgreSQL 데이터베이스 (Supabase 권장)
- Supabase 프로젝트 + `blockmind-files` Storage bucket
- Google OAuth 클라이언트
- Gemini API 키
- 이메일 OTP 발송용 Resend 계정 (없으면 개발 시 콘솔 출력으로 대체)

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.local 생성)
cp .env.example .env.local
# 아래 환경변수 섹션 참고

# 3. DB 스키마 적용
npx prisma db push

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 기타 명령어

```bash
npm test              # 단위 테스트 실행
npm run test:e2e      # E2E 테스트 실행 (Playwright)
npm run build         # 프로덕션 빌드
npm start             # 프로덕션 서버 실행
```


