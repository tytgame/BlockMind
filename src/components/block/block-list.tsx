'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
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
import { type Block } from '@/types/block';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { getBlockIcon, getBlockIconColor } from '@/lib/get-block-icon';

interface BlockListProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  forceCollapsed?: boolean;
}

export function BlockList({ collapsed, onToggleCollapse, forceCollapsed }: BlockListProps) {
  const effectiveCollapsed = forceCollapsed ?? collapsed;
  const { blocks, reorderBlocks } = useBlockStore();
  const [selectedBlock, setSelectedBlock] = React.useState<Block | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [tooltip, setTooltip] = React.useState<{ label: string; top: number; right: number } | null>(null);
  const t = useTranslations('blockList');

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
      // fire-and-forget: 재정렬 후 순서를 DB에 반영
      const { blocks: reordered } = useBlockStore.getState();
      void fetch('/api/blocks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((b) => b.id) }),
      });
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

  if (effectiveCollapsed) {
    return (
      <>
      <div className="h-full w-full flex flex-col bg-[#1a1d21] text-white">
        <div className="p-3 border-b border-white/10 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-gray-300 hover:text-white hover:bg-white/10"
            onClick={onToggleCollapse}
            aria-label={t('expandSidebar')}
            title={t('expandSidebar')}
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
                aria-label={block.label}
                onClick={() => handleOpenDetail(block)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    label: block.label,
                    top: rect.top + rect.height / 2,
                    right: window.innerWidth - rect.left + 10,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                className={cn(
                  'h-10 w-10 rounded-md flex items-center justify-center',
                  'transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60',
                  !block.isVisible && 'opacity-40'
                )}
              >
                {(() => {
                  const Icon = getBlockIcon(block);
                  const colorClass = getBlockIconColor(block);
                  return <Icon className={cn('h-7 w-7', colorClass)} />;
                })()}
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
            title={t('settings')}
            aria-label={t('settings')}
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
      {tooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tooltip.top,
            right: tooltip.right,
            transform: 'translateY(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="rounded-md bg-[#2a2f3a] border border-white/10 px-2.5 py-1.5 text-xs text-gray-100 whitespace-nowrap shadow-lg"
        >
          {tooltip.label}
        </div>,
        document.body
      )}
    </>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#1a1d21]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10 flex justify-between items-center">
        <h2 className="font-semibold text-white">{t('currentBlocks')}</h2>
        <div className="flex items-center gap-1">
          {/* <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
          </Button> */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
            onClick={onToggleCollapse}
            aria-label={t('collapseSidebar')}
            title={t('collapseSidebar')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Memory Label */}
      <div className="px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {t('activeMemory')}
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
                  <p className="text-sm">{t('noBlocks')}</p>
                  <p className="text-xs mt-1">{t('noBlocksSubtitle')}</p>
                </div>
              )}
            </SortableContext>
          </DndContext>
      </ScrollArea>
    </div>
  );
}
