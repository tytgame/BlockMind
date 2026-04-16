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


## 서비스 소개

대부분의 AI 서비스에서 사용자는 무엇이 계속 기억되고 있는지, 왜 그런 답이 나왔는지 그리고 어떤 기준이 현재 응답에 반영되는지 확인하기 어렵습니다.

BlockMind는 이 문제를 해결하기 위해 맥락을 블록으로 저장하여 UI로 보여줍니다.

- 블랙박스같은 LLM의 컨텍스트를 **블록**으로 시각화합니다.
- 블록의 활성화/비활성화로 사용자가 AI의 답변 기준을 직접 조정합니다.
- 기억할 만한 정보는 대화 이후 **자동으로 추출해 블록으로 쌓습니다.**


<br/>

## 기술 스택

### Frontend
- **Framework**: Next.js, React, TypeScript
- **UI**: Tailwind CSS, shadcn ui, Radix UI, Lucide Icons
- **State**: Zustand
- **DnD**: dnd-kit

### Backend & AI
- **AI**: Vercel AI SDK
- **Auth**: NextAuth.js, Google OAuth, Credentials (Email OTP)
- **Database**: Prisma + PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **File Processing**: Mammoth (DOCX), Files API (PDF)

### Infra & 기타
- **i18n**: next-intl (다국어 지원)
- **Email**: Resend
- **Testing**: Jest + ts-jest (단위 테스트), Playwright (E2E)

<br/>

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


