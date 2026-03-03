'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, FileType, Download } from 'lucide-react';
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
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', block.color)} />
            <span className="text-xs uppercase tracking-[0.14em] text-gray-400">
              {block.type === 'image' ? 'image' : block.type === 'file' ? 'file' : 'memory'}
            </span>
          </div>
          <DialogTitle className="mt-3 text-xl font-semibold text-white break-words leading-tight">
            {block.label}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-gray-400">
            Context block details
          </DialogDescription>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* 이미지 타입: 전체 이미지 표시 */}
          {block.type === 'image' && block.signedUrl && (
            <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.signedUrl}
                alt={block.label}
                className="max-h-80 w-full rounded object-contain"
              />
              {block.fileUrl && (
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/10 gap-1.5"
                    onClick={handleDownload}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('download')}
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* 파일 타입: 파일 정보 + 상태 */}
          {block.type === 'file' && (
            <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
              <div className="flex items-center gap-3">
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
                {block.fileUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/10 gap-1.5 flex-shrink-0"
                    onClick={handleDownload}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('download')}
                  </Button>
                )}
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

          <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-400">주제</p>
            <p className="mt-2 text-sm font-medium text-gray-100 break-words">
              {block.label}
            </p>
          </section>

          <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-400">세부 내용</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200 max-h-[45vh] overflow-y-auto pr-1">
              {block.content}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
