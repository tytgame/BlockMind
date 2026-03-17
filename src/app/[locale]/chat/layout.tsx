import { auth } from '@/auth';
import { getUserBlocks } from '@/lib/get-user-blocks';
import { ClientChatLayout } from '@/components/chat/client-chat-layout';
import { Block } from '@/types/block';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  let initialBlocks: Block[] = [];

  try {
    const session = await auth();
    if (session?.user?.id) {
      initialBlocks = await getUserBlocks(session.user.id);
    }
  } catch {
    // 서버 데이터 실패 시 빈 배열 → 클라이언트 fallback이 처리
  }

  return (
    <ClientChatLayout initialBlocks={initialBlocks}>
      {children}
    </ClientChatLayout>
  );
}
