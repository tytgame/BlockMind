'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBlockStore } from '@/store/block-store';
import { BlockItem } from './block-item';
import { BlockDetailDialog } from './block-detail-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { BlockType, type Block } from '@/types/block';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockListProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const typeBadgeColors: Record<BlockType, string> = {
  persona: 'bg-blue-500',
  rule: 'bg-red-500',
  data: 'bg-green-500',
  output: 'bg-purple-500',
};

export function BlockList({ collapsed, onToggleCollapse }: BlockListProps) {
  const { blocks, reorderBlocks } = useBlockStore();
  const [selectedBlock, setSelectedBlock] = React.useState<Block | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderBlocks(active.id as string, over.id as string);
    }
  }

  const handleOpenDetail = (block: Block) => {
    setSelectedBlock(block);
    setIsDetailOpen(true);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) setSelectedBlock(null);
  };

  if (collapsed) {
    return (
      <div className="h-full flex flex-col bg-[#1a1d21] text-white">
        <div className="p-3 border-b border-white/10 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-gray-300 hover:text-white hover:bg-white/10"
            onClick={onToggleCollapse}
            aria-label="Expand blocks sidebar"
            title="Expand blocks sidebar"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 py-3 flex flex-col items-center gap-2">
            {blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                title={block.label}
                aria-label={block.label}
                onClick={() => handleOpenDetail(block)}
                className={cn(
                  'relative h-10 w-10 rounded-md border border-white/10 bg-[#252830]',
                  'transition-colors hover:bg-[#2a2f3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60',
                  !block.isVisible && 'opacity-50'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0 left-0 right-0 h-1 rounded-t-md',
                    typeBadgeColors[block.type]
                  )}
                />
                <span className="text-[10px] font-semibold uppercase text-gray-200">
                  {block.type.charAt(0)}
                </span>
              </button>
            ))}

            {blocks.length === 0 && (
              <div className="h-10 w-10 rounded-md border border-dashed border-white/20 bg-[#252830]" />
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-white/10 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-gray-300 hover:text-white hover:bg-white/10"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <BlockDetailDialog
          block={selectedBlock}
          open={isDetailOpen}
          onOpenChange={handleDetailOpenChange}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1d21]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10 flex justify-between items-center">
        <h2 className="font-semibold text-white">Current Blocks</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
            onClick={onToggleCollapse}
            aria-label="Collapse blocks sidebar"
            title="Collapse blocks sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Memory Label */}
      <div className="px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Active Memory
        </h3>
      </div>

      {/* Block List */}
      <ScrollArea className="flex-1 px-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block) => (
              <BlockItem key={block.id} block={block} />
            ))}
            {blocks.length === 0 && (
              <div className="text-center py-10 text-gray-500 border-2 border-dashed border-white/10 rounded-lg">
                <p className="text-sm">No blocks yet.</p>
                <p className="text-xs mt-1">Start chatting to generate context.</p>
              </div>
            )}
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  );
}
