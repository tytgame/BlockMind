import { ChatInterface } from '@/components/chat/chat-interface';
import { BlockList } from '@/components/block/block-list';

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel: Chat Interface */}
      <div className="w-1/2 min-w-[320px] h-full">
        <ChatInterface />
      </div>

      {/* Right Panel: Block Context Stack */}
      <div className="w-1/2 min-w-[320px] h-full border-l bg-muted/30">
        <BlockList />
      </div>
    </div>
  );
}
