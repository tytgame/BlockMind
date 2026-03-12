import { Resend } from 'resend';

// RESEND_API_KEY 없으면 null — send-otp에서 개발용 콘솔 fallback 처리
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// 발신자 주소: 도메인 인증 전엔 onboarding@resend.dev 사용 가능
export const EMAIL_FROM = process.env.EMAIL_FROM;
