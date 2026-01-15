import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt', // Edge Runtime 호환을 위해 JWT 사용
  },
  callbacks: {
    ...authConfig.callbacks,
    // JWT에 사용자 ID 추가
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // 세션에 사용자 ID 추가
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
