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
      const isOnChat = nextUrl.pathname.startsWith('/chat');
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      if (isOnChat) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL('/chat', nextUrl));
      }

      return true;
    },
  },
};
