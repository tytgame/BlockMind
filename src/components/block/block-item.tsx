'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { GripVertical, X, Eye, EyeOff } from 'lucide-react';
import { Block } from '@/types/block';
import { useBlockStore } from '@/store/block-store';
import { cn } from '@/lib/utils';
import { BlockDetailDialog } from './block-detail-dialog';
import { useTranslations } from 'next-intl';

interface BlockItemProps {
  block: Block;
}

export function BlockItem({ block }: BlockItemProps) {
  const { updateBlock, removeBlock } = useBlockStore();
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const t = useTranslations('blockItem');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 group">
      <div
        className={cn(
          'relative rounded-lg bg-[#252830] overflow-hidden transition-all',
          'hover:bg-[#2a2f3a]',
          !block.isVisible && 'opacity-50'
        )}
      >
        {/* Color Bar */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1',
            block.color
          )}
        />

        {/* Main Content */}
        <div
          className="pl-4 pr-2 py-3 cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => setIsDetailOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsDetailOpen(true);
            }
          }}
        >
          <div className="flex items-start gap-2">
            {/* Drag Handle - Hidden by default, show on hover */}
            <div
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">{block.label}</h4>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  updateBlock(block.id, { isVisible: !block.isVisible });
                }}
              >
                {block.isVisible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteConfirmOpen(true);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BlockDetailDialog
        block={block}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#1a1d21] text-white">
          <div className="space-y-4">
            <DialogTitle className="text-lg font-semibold text-white">
              {t('deleteConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              {t('deleteConfirmDescription', { label: block.label })}
            </DialogDescription>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                className="text-gray-300 hover:bg-white/10 hover:text-white"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  removeBlock(block.id);
                  setIsDeleteConfirmOpen(false);
                }}
              >
                {t('delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
