'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, FileType, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export type SentFileInfo = {
  fileName: string;
  fileType: string;
  storagePath: string;
  base64?: string;
};

interface FilePreviewModalProps {
  file: SentFileInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewModal({ file, open, onOpenChange }: FilePreviewModalProps) {
  const t = useTranslations('blockItem');

  if (!file) return null;

  const isImage = file.fileType.startsWith('image/');
  const isPdf = file.fileType === 'application/pdf';
  const downloadUrl = `/api/files/download?path=${encodeURIComponent(file.storagePath)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-[#1a1d21] p-0 text-white sm:max-w-4xl">
        <DialogDescription className="sr-only">File preview</DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            {isImage ? (
              <span className="text-xs font-medium text-blue-400 flex-shrink-0">IMG</span>
            ) : isPdf ? (
              <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
            ) : (
              <FileType className="h-5 w-5 text-blue-400 flex-shrink-0" />
            )}
            <DialogTitle className="text-sm font-medium text-white truncate">
              {file.fileName}
            </DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-white/10 gap-1.5 flex-shrink-0 ml-4"
            asChild
          >
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5" />
              {t('download')}
            </a>
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(85vh - 72px)' }}>
          {isImage ? (
            <div className="p-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.base64 ?? downloadUrl}
                alt={file.fileName}
                className="max-w-full rounded"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={downloadUrl}
              className="w-full"
              style={{ height: 'calc(85vh - 72px)' }}
              title={file.fileName}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
              <FileType className="h-16 w-16 opacity-40" />
              <p className="text-sm text-gray-300">{file.fileName}</p>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  {t('download')}
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
