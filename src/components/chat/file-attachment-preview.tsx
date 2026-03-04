'use client';

import { X, FileText, FileType, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type AttachedFile = {
  /** 안정적인 파일 추적용 ID */
  id: string;
  /** 원본 File 객체 */
  file: File;
  /** 이미지: ObjectURL, PDF/docx: '' */
  preview: string;
  /** Supabase 업로드 후 세팅 */
  storagePath: string;
  /** 이미지용 base64 data URL */
  base64?: string;
  /** PDF용 Gemini Files URI */
  geminiFileUri?: string;
  geminiExpiresAt?: string;
  /** docx용 추출 텍스트 */
  extractedText?: string;
  status: 'uploading' | 'ready' | 'error';
};

interface FileAttachmentPreviewProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileAttachmentPreview({ files, onRemove }: FileAttachmentPreviewProps) {
  const t = useTranslations('fileUpload');

  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2 pt-1">
      {files.map((f) => (
        <div
          key={f.id}
          className={`relative flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm bg-white/8 text-white
            ${f.status === 'error' ? 'border-destructive' : 'border-white/20'}
            ${f.status === 'uploading' ? 'opacity-70' : ''}
          `}
        >
          {/* 이미지 썸네일 또는 파일 아이콘 */}
          {f.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.preview}
              alt={f.file.name}
              className="h-10 w-10 rounded object-cover flex-shrink-0"
            />
          ) : f.file.type === 'application/pdf' ? (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-white/10 flex-shrink-0">
              <FileText className="h-5 w-5 text-gray-300" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-white/10 flex-shrink-0">
              <FileType className="h-5 w-5 text-gray-300" />
            </div>
          )}

          {/* 파일 정보 */}
          <div className="flex flex-col min-w-0 max-w-32">
            <span className="truncate text-xs font-medium leading-tight">{f.file.name}</span>
            <span className="text-xs text-gray-400 leading-tight">
              {formatBytes(f.file.size)}
            </span>
          </div>

          {/* 업로드 중 스피너 */}
          {f.status === 'uploading' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />
          )}

          {/* 에러 표시 */}
          {f.status === 'error' && (
            <span className="text-xs text-destructive flex-shrink-0">
              {t('uploadError').split('.')[0]}
            </span>
          )}

          {/* X 버튼 */}
          <button
            type="button"
            onClick={() => onRemove(f.id)}
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/80 transition-colors"
            aria-label="Remove file"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
