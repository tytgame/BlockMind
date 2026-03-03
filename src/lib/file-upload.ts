/**
 * 파일 업로드 유틸리티 (클라이언트 전용)
 * Supabase Storage 직접 업로드 → Gemini Files API or 텍스트 추출
 */

export type FileUploadResult =
  | { type: 'image'; storagePath: string; base64: string; mimeType: string }
  | { type: 'pdf'; storagePath: string; geminiFileUri: string; geminiExpiresAt: string | null; mimeType: string }
  | { type: 'docx'; storagePath: string; extractedText: string; mimeType: string };

/**
 * 1단계: 서버에서 presigned upload URL 받기
 */
async function getPresignedUploadUrl(
  fileName: string,
  mimeType: string
): Promise<{ uploadUrl: string; storagePath: string }> {
  const res = await fetch('/api/files/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, mimeType }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  return res.json() as Promise<{ uploadUrl: string; storagePath: string }>;
}

/**
 * 2단계: presigned URL로 Supabase에 직접 업로드
 */
async function uploadToSupabaseDirect(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('Failed to upload to Supabase');
}

/**
 * 이미지 파일 업로드 (압축된 File + base64 반환)
 */
export async function uploadImage(
  compressedFile: File,
  base64: string
): Promise<{ storagePath: string; base64: string; mimeType: string }> {
  const { uploadUrl, storagePath } = await getPresignedUploadUrl(
    compressedFile.name,
    compressedFile.type
  );
  await uploadToSupabaseDirect(uploadUrl, compressedFile);
  return { storagePath, base64, mimeType: compressedFile.type };
}

/**
 * PDF 파일 업로드 → Gemini Files API 등록
 */
export async function uploadPdf(
  file: File
): Promise<{ storagePath: string; geminiFileUri: string; geminiExpiresAt: string | null; mimeType: string }> {
  const { uploadUrl, storagePath } = await getPresignedUploadUrl(file.name, file.type);
  await uploadToSupabaseDirect(uploadUrl, file);

  const res = await fetch('/api/upload/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storagePath, mimeType: file.type, fileName: file.name }),
  });
  if (!res.ok) throw new Error('Failed to upload to Gemini');

  const { geminiFileUri, geminiExpiresAt } = (await res.json()) as {
    geminiFileUri: string;
    geminiExpiresAt: string | null;
  };

  return { storagePath, geminiFileUri, geminiExpiresAt, mimeType: file.type };
}

/**
 * docx 파일 업로드 → 텍스트 추출
 */
export async function uploadDocx(
  file: File
): Promise<{ storagePath: string; extractedText: string; mimeType: string }> {
  const { uploadUrl, storagePath } = await getPresignedUploadUrl(file.name, file.type);
  await uploadToSupabaseDirect(uploadUrl, file);

  const res = await fetch('/api/upload/extract-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storagePath, fileName: file.name }),
  });
  if (!res.ok) throw new Error('Failed to extract text');

  const { text } = (await res.json()) as { text: string };
  return { storagePath, extractedText: text, mimeType: file.type };
}

// 파일 크기 제한 (bytes)
export const FILE_LIMITS = {
  image: 10 * 1024 * 1024,  // 10MB
  pdf: 20 * 1024 * 1024,    // 20MB
  docx: 10 * 1024 * 1024,   // 10MB
} as const;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
