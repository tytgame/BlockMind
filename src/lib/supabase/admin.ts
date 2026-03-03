import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 서비스 롤 클라이언트 (서버 전용)
 * RLS를 우회하여 Storage presigned URL 생성 등 관리자 작업에 사용
 * 절대 클라이언트 컴포넌트에서 import하지 말 것
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const STORAGE_BUCKET = 'blockmind-files';
