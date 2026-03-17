import { prisma } from '@/lib/prisma';
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase/admin';
import { Block } from '@/types/block';

/**
 * 사용자의 블록 목록을 조회하고, 파일 블록에 signedUrl을 주입하여 반환한다.
 * Server Component와 API route 양쪽에서 공유한다.
 *
 * - sourceSession 관계를 flat하게 변환 (sourceSessionTitle)
 * - Prisma Date 필드를 ISO string으로 변환 (Server Component props 직렬화 호환)
 * - image/file 블록에 Supabase signedUrl(1h) 주입
 */
export async function getUserBlocks(userId: string): Promise<Block[]> {
  const blocks = await prisma.block.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    include: { sourceSession: { select: { title: true } } },
  });

  // sourceSession 관계 → sourceSessionTitle flat 변환
  // createdAt/updatedAt (Prisma Date) 제거 — Block 타입에 없고 직렬화 문제 방지
  const flatBlocks = blocks.map(({ sourceSession, createdAt, updatedAt, ...b }) => ({
    ...b,
    geminiExpiresAt: b.geminiExpiresAt?.toISOString() ?? null,
    sourceSessionTitle: sourceSession?.title ?? null,
    signedUrl: null as string | null,
  }));

  // 파일이 있는 블록에 signedUrl 주입 — 5개씩 청크로 처리
  const CONCURRENCY = 5;
  const fileIndices = flatBlocks.reduce<number[]>((acc, b, i) => {
    if (b.fileUrl) acc.push(i);
    return acc;
  }, []);

  if (fileIndices.length === 0) {
    return flatBlocks as unknown as Block[];
  }

  const supabase = createAdminClient();

  for (let i = 0; i < fileIndices.length; i += CONCURRENCY) {
    const chunk = fileIndices.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      chunk.map(async (idx) => {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(flatBlocks[idx].fileUrl!, 3600);
        flatBlocks[idx].signedUrl = data?.signedUrl ?? null;
      })
    );
  }

  return flatBlocks as unknown as Block[];
}
