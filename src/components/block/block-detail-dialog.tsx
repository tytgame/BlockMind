'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Block } from '@/types/block';
import { cn } from '@/lib/utils';

interface BlockDetailDialogProps {
  block: Block | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockDetailDialog({
  block,
  open,
  onOpenChange,
}: BlockDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {block && (
        <DialogContent className="max-w-2xl border-white/10 bg-[#1a1d21] p-0 text-white sm:max-w-2xl">
          <div className="border-b border-white/10 bg-[#252830] px-6 py-5">
            <div className="flex items-center gap-2">
              <span
                className={cn('h-2.5 w-2.5 rounded-full', block.color)}
              />
              <span className="text-xs uppercase tracking-[0.14em] text-gray-400">
                memory
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
            <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-400">주제</p>
              <p className="mt-2 text-sm font-medium text-gray-100 break-words">
                {block.label}
              </p>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#252830] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-400">
                세부 내용
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200 max-h-[45vh] overflow-y-auto pr-1">
                {block.content}
              </p>
            </section>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
