import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "BlockMind",
  description: "AI의 맥락을 블록으로 조립하여 완벽한 대화를 설계하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#2f3235',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#ffffff',
            },
          }}
        />
      </body>
    </html>
  );
}
