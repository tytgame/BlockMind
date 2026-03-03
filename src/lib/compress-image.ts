import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

/**
 * 이미지 파일을 1.5MB 이하로 압축합니다.
 * 이미 작은 파일은 원본 반환.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file;
  return imageCompression(file, COMPRESSION_OPTIONS);
}

/**
 * File을 base64 Data URL로 변환합니다.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
