import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { resend, EMAIL_FROM } from '@/lib/resend';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10분

function otpEmailHtml(otp: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#0f1419;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="400" cellpadding="0" cellspacing="0" style="background:#1a1d21;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 0;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">BlockMind</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0;">
            <h1 style="margin:0;font-size:20px;font-weight:600;color:#ffffff;">인증 코드를 확인하세요</h1>
            <p style="margin:12px 0 0;font-size:14px;color:#9ca3af;line-height:1.6;">
              아래 6자리 코드를 BlockMind 로그인 화면에 입력해 주세요.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <div style="background:#252830;border-radius:12px;padding:28px;text-align:center;">
              <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#ffffff;font-variant-numeric:tabular-nums;">${otp}</span>
            </div>
            <p style="margin:16px 0 0;font-size:13px;color:#6b7280;text-align:center;">
              이 코드는 <strong style="color:#9ca3af;">10분</strong> 후 만료됩니다.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;">
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px;" />
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
              본인이 요청하지 않은 경우 이 이메일을 무시하세요.<br/>
              BlockMind는 절대 비밀번호나 개인정보를 요청하지 않습니다.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 6자리 OTP 생성 + SHA-256 해시
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expires = new Date(Date.now() + OTP_EXPIRY_MS);

    // 기존 토큰 삭제 후 새 토큰 저장
    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token: hashedOtp, expires },
    });

    // 이메일 발송
    if (resend) {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: normalizedEmail,
        subject: `[BlockMind] 인증 코드: ${otp}`,
        html: otpEmailHtml(otp),
      });
      if (error) {
        console.error('[send-otp] Resend error:', error);
        return NextResponse.json({ error: 'send_failed' }, { status: 500 });
      }
    } else {
      // 개발용 fallback: API 키 없으면 콘솔에 출력
      console.log(`\n[DEV] OTP for ${normalizedEmail}: ${otp}\n`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[send-otp]', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
