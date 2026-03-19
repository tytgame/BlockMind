import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';
import crypto from 'crypto';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { type: 'email' },
        otp: { type: 'text' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const otp = credentials?.otp as string | undefined;
        if (!email || !otp) return null;

        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

        // VerificationToken 조회 및 만료 확인
        const record = await prisma.verificationToken.findFirst({
          where: { identifier: email, token: hashedOtp },
        });
        if (!record || record.expires < new Date()) return null;

        // 사용한 토큰 삭제 (재사용 방지)
        await prisma.verificationToken.deleteMany({ where: { identifier: email } });

        // 유저 생성 or 기존 유저 반환
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, emailVerified: new Date() },
          });
        } else if (!user.emailVerified) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  session: {
    strategy: 'jwt', // Edge Runtime 호환을 위해 JWT 사용
  },
  callbacks: {
    ...authConfig.callbacks,
    // JWT에 사용자 ID 추가
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.picture = user.image;
      }
      return token;
    },
    // 세션에 사용자 ID + 이미지 추가
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.image = (token.picture as string) ?? null;
      }
      return session;
    },
  },
});
