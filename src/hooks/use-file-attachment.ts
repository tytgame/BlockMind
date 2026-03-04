import * as React from 'react';
import { useTranslations } from 'next-intl';
import { type AttachedFile } from '@/components/chat/file-attachment-preview';
import { compressImage, fileToBase64 } from '@/lib/compress-image';
import {
  uploadImage,
  uploadPdf,
  uploadDocx,
  FILE_LIMITS,
  ACCEPTED_IMAGE_TYPES,
} from '@/lib/file-upload';

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type PendingFileMeta = {
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  geminiFileUri?: string;
  geminiExpiresAt?: string;
};

interface UseFileAttachmentOptions {
  onError: (message: string) => void;
}

export function useFileAttachment({ onError }: UseFileAttachmentOptions) {
  const tFile = useTranslations('fileUpload');
  const [attachedFiles, setAttachedFiles] = React.useState<AttachedFile[]>([]);

  // 비동기 클로저에서 최신값 읽기 위해 ref로 미러링
  const attachedFilesRef = React.useRef<AttachedFile[]>([]);
  React.useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  // PDF/docx 메타 — onFinish(블록 추출)까지 유지
  const pendingFileMetaRef = React.useRef<PendingFileMeta | undefined>(undefined);

  const addFile = React.useCallback(
    async (file: File) => {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isPdf = file.type === 'application/pdf';
      const isDocx = file.type === DOCX_MIME;

      if (!isImage && !isPdf && !isDocx) { onError(tFile('errorType')); return; }
      if (isImage && file.size > FILE_LIMITS.image) { onError(tFile('errorSizeImage')); return; }
      if (isPdf && file.size > FILE_LIMITS.pdf) { onError(tFile('errorSizePdf')); return; }
      if (isDocx && file.size > FILE_LIMITS.docx) { onError(tFile('errorSizeDocx')); return; }
      if (isPdf && attachedFilesRef.current.some((f) => f.file.type === 'application/pdf')) {
        onError(tFile('errorPdfLimit'));
        return;
      }

      const id = crypto.randomUUID();
      const preview = isImage ? URL.createObjectURL(file) : '';
      setAttachedFiles((prev) => [
        ...prev,
        { id, file, preview, storagePath: '', status: 'uploading' },
      ]);

      try {
        if (isImage) {
          const compressed = await compressImage(file);
          const base64 = await fileToBase64(compressed);
          const result = await uploadImage(compressed, base64);
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, status: 'ready', storagePath: result.storagePath, base64: result.base64 }
                : f
            )
          );
        } else if (isPdf) {
          const result = await uploadPdf(file);
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: 'ready',
                    storagePath: result.storagePath,
                    geminiFileUri: result.geminiFileUri,
                    geminiExpiresAt: result.geminiExpiresAt ?? undefined,
                  }
                : f
            )
          );
        } else {
          const result = await uploadDocx(file);
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, status: 'ready', storagePath: result.storagePath, extractedText: result.extractedText }
                : f
            )
          );
        }
      } catch {
        setAttachedFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'error' } : f))
        );
        onError(tFile('uploadError'));
      }
    },
    [tFile, onError]
  );

  const handleFileInputChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) await addFile(file);
      e.target.value = '';
    },
    [addFile]
  );

  const handlePaste = React.useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await addFile(file);
          }
        }
      }
    },
    [addFile]
  );

  const removeFile = React.useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = React.useCallback(() => {
    attachedFilesRef.current.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setAttachedFiles([]);
  }, []);

  return {
    attachedFiles,
    addFile,
    handleFileInputChange,
    handlePaste,
    removeFile,
    clearFiles,
    pendingFileMetaRef,
  };
}
