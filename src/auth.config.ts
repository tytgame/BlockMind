import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Edge Runtime에서 사용할 수 있는 설정 (Prisma 제외)
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // as-needed: 한국어는 prefix 없음 (/chat), 나머지는 prefix 있음 (/en/chat)
      const isOnChat = pathname === '/chat' || /^\/(en|zh|ja)\/chat/.test(pathname);
      const isOnLogin = pathname === '/login' || /^\/(en|zh|ja)\/login/.test(pathname);

      const localeMatch = pathname.match(/^\/(en|zh|ja)\//);
      const prefix = localeMatch ? `/${localeMatch[1]}` : '';

      if (isOnChat && !isLoggedIn) {
        return Response.redirect(new URL(`${prefix}/login`, nextUrl));
      }

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL(`${prefix}/chat`, nextUrl));
      }

      return true;
    },
  },
};
