import { ChatInterface } from '@/components/chat/chat-interface';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { BlockList } from '@/components/block/block-list';

export default function ChatPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel: Chat Sidebar */}
      <div className="w-64 min-w-[256px] h-full flex-shrink-0">
        <ChatSidebar />
      </div>

      {/* Center Panel: Chat Interface */}
      <div className="flex-1 min-w-[400px] h-full">
        <ChatInterface />
      </div>

      {/* Right Panel: Block Context Stack */}
      <div className="w-80 min-w-[320px] h-full flex-shrink-0">
        <BlockList />
      </div>
    </div>
  );
}
