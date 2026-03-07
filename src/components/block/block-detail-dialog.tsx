'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, FileType } from 'lucide-react';
import { Block } from '@/types/block';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface BlockDetailDialogProps {
  block: Block | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isPdfExpired(block: Block): boolean {
  if (block.fileType !== 'application/pdf') return false;
  if (!block.geminiExpiresAt) return true;
  return new Date(block.geminiExpiresAt) < new Date();
}

export function BlockDetailDialog({
  block,
  open,
  onOpenChange,
}: BlockDetailDialogProps) {
  const t = useTranslations('blockItem');

  if (!block) return null;

  const isPdf = block.type === 'file' && block.fileType === 'application/pdf';
  const expired = isPdf && isPdfExpired(block);

  const handleDownload = () => {
    if (!block.fileUrl) return;
    window.open(`/api/files/download?path=${encodeURIComponent(block.fileUrl)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#1a1d21] p-0 text-white sm:max-w-2xl">
        <div className="border-b border-white/10 bg-[#252830] px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-white break-words leading-tight">
            {block.label}
          </DialogTitle>
          <DialogDescription className="sr-only">Context block details</DialogDescription>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* 이미지 타입: 전체 이미지 표시 */}
          {block.type === 'image' && block.signedUrl && (
            <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.signedUrl}
                alt={block.label}
                className={cn('max-h-80 w-full rounded object-contain', block.fileUrl && 'cursor-pointer hover:opacity-80 transition-opacity')}
                onClick={block.fileUrl ? handleDownload : undefined}
              />
            </section>
          )}

          {/* 파일 타입: 파일 정보 + 상태 */}
          {block.type === 'file' && (
            <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
              <div
                className={cn(
                  'inline-flex items-center gap-3 rounded-md transition-colors',
                  block.fileUrl && 'cursor-pointer hover:bg-white/10 px-2 py-1.5 -mx-2'
                )}
                onClick={block.fileUrl ? handleDownload : undefined}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded bg-white/5 flex-shrink-0">
                  {isPdf ? (
                    <FileText className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FileType className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{block.fileName}</p>
                  {block.fileSize !== undefined && (
                    <p className="text-xs text-gray-400">{formatBytes(block.fileSize)}</p>
                  )}
                </div>
              </div>

              {/* PDF 만료 상태 */}
              {isPdf && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', expired ? 'bg-red-400' : 'bg-green-400')} />
                  <span className={cn('text-xs', expired ? 'text-red-400' : 'text-green-400')}>
                    {expired ? t('memoryExpired') : t('memoryActive')}
                  </span>
                </div>
              )}
            </section>
          )}

          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200 max-h-[45vh] overflow-y-auto pr-1">
            {block.content}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
