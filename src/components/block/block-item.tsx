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
import { GripVertical, X, Eye, EyeOff, FileText, FileType, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Block } from '@/types/block';
import { useBlockStore } from '@/store/block-store';
import { cn } from '@/lib/utils';
import { BlockDetailDialog } from './block-detail-dialog';
import { useTranslations } from 'next-intl';

interface BlockItemProps {
  block: Block;
}

function isPdfExpired(block: Block): boolean {
  if (block.fileType !== 'application/pdf') return false;
  if (!block.geminiExpiresAt) return true;
  return new Date(block.geminiExpiresAt) < new Date();
}

function getHoursLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

export function BlockItem({ block }: BlockItemProps) {
  const { updateBlock, removeBlock } = useBlockStore();
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
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

  const isPdf = block.type === 'file' && block.fileType === 'application/pdf';
  const expired = isPdf && isPdfExpired(block);
  const hoursLeft = isPdf && block.geminiExpiresAt && !expired ? getHoursLeft(block.geminiExpiresAt) : null;

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/blocks/${block.id}/refresh`, { method: 'PATCH' });
      if (res.ok) {
        const updated = (await res.json()) as Block;
        updateBlock(block.id, {
          geminiFileUri: updated.geminiFileUri,
          geminiExpiresAt: updated.geminiExpiresAt,
        });
      }
    } catch {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!block.fileUrl) return;
    window.open(`/api/files/download?path=${encodeURIComponent(block.fileUrl)}`, '_blank');
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
        <div className={cn('absolute left-0 top-0 bottom-0 w-1', block.color)} />

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
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-500" />
            </div>

            {/* 이미지 타입: 썸네일 */}
            {block.type === 'image' && block.signedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={block.signedUrl}
                alt={block.label}
                className="h-10 w-10 rounded object-cover flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* 파일 타입: 아이콘 */}
            {block.type === 'file' && (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-white/5 flex-shrink-0">
                {isPdf ? (
                  <FileText className="h-4 w-4 text-gray-400" />
                ) : (
                  <FileType className="h-4 w-4 text-gray-400" />
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">{block.label}</h4>

              {/* PDF 만료 상태 */}
              {isPdf && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', expired ? 'bg-red-400' : 'bg-green-400')} />
                  {expired ? (
                    <span className="text-xs text-red-400">{t('memoryExpired')}</span>
                  ) : hoursLeft !== null ? (
                    <span className="text-xs text-green-400">
                      {t('memoryActive')} · {t('hoursLeft', { hours: hoursLeft })}
                    </span>
                  ) : (
                    <span className="text-xs text-green-400">{t('memoryActive')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* PDF 만료 시 새로고침 버튼 */}
              {isPdf && expired && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title={t('refreshMemory')}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              )}

              {/* 다운로드 버튼 (파일 타입 전체) */}
              {block.fileUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-500 hover:text-white hover:bg-white/10"
                  onClick={handleDownload}
                  title={t('download')}
                >
                  <Download className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  const newVisibility = !block.isVisible;
                  updateBlock(block.id, { isVisible: newVisibility });
                  void fetch(`/api/blocks/${block.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isVisible: newVisibility }),
                  });
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
                  void fetch(`/api/blocks/${block.id}`, { method: 'DELETE' });
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
