/**
 * getBlockIcon(block) — category/type별 lucide 아이콘 매핑 검증
 */

import {
  Database,
  ImageIcon,
  FileText,
  FileType2,
  File,
  PawPrint,
  Dumbbell,
  Plane,
  Code2,
  UtensilsCrossed,
  Music,
  BookOpen,
  Heart,
  Briefcase,
  Gamepad2,
  DollarSign,
  ShoppingBag,
  Home,
  Trophy,
  Film,
  User,
} from 'lucide-react';
import { getBlockIcon } from '@/lib/get-block-icon';
import type { Block, BlockCategory } from '@/types/block';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: 'test-id',
    type: 'data',
    label: 'Test Block',
    content: 'Test content',
    isVisible: true,
    ...overrides,
  };
}

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('getBlockIcon', () => {

  // ── image 타입 ────────────────────────────────────────────────────────

  describe('image 타입', () => {
    it('항상 ImageIcon 반환', () => {
      expect(getBlockIcon(makeBlock({ type: 'image' }))).toBe(ImageIcon);
    });

    it('category가 있어도 image 타입이면 ImageIcon 반환', () => {
      expect(getBlockIcon(makeBlock({ type: 'image', category: 'animal' }))).toBe(ImageIcon);
    });
  });

  // ── file 타입 ─────────────────────────────────────────────────────────

  describe('file 타입', () => {
    it('PDF → FileType2', () => {
      expect(getBlockIcon(makeBlock({ type: 'file', fileType: 'application/pdf' }))).toBe(FileType2);
    });

    it('text/plain → FileText', () => {
      expect(getBlockIcon(makeBlock({ type: 'file', fileType: 'text/plain' }))).toBe(FileText);
    });

    it('application/msword → FileText', () => {
      expect(getBlockIcon(makeBlock({ type: 'file', fileType: 'application/msword' }))).toBe(FileText);
    });

    it('application/vnd.openxmlformats-officedocument.wordprocessingml.document → FileText', () => {
      expect(getBlockIcon(makeBlock({
        type: 'file',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }))).toBe(FileText);
    });

    it('알 수 없는 MIME → File', () => {
      expect(getBlockIcon(makeBlock({ type: 'file', fileType: 'application/zip' }))).toBe(File);
    });

    it('fileType 없음 → File', () => {
      expect(getBlockIcon(makeBlock({ type: 'file' }))).toBe(File);
    });
  });

  // ── data 타입 — 카테고리별 ────────────────────────────────────────────

  describe('data 타입 — 16개 카테고리', () => {
    const cases: [BlockCategory, unknown][] = [
      ['animal',        PawPrint],
      ['fitness',       Dumbbell],
      ['travel',        Plane],
      ['coding',        Code2],
      ['food',          UtensilsCrossed],
      ['music',         Music],
      ['study',         BookOpen],
      ['health',        Heart],
      ['work',          Briefcase],
      ['game',          Gamepad2],
      ['finance',       DollarSign],
      ['shopping',      ShoppingBag],
      ['home',          Home],
      ['sports',        Trophy],
      ['entertainment', Film],
      ['person',        User],
    ];

    it.each(cases)('category="%s" → 올바른 아이콘 반환', (category, expectedIcon) => {
      expect(getBlockIcon(makeBlock({ category }))).toBe(expectedIcon);
    });
  });

  // ── data 타입 — 기본값 ───────────────────────────────────────────────

  describe('data 타입 — 기본값 (Database)', () => {
    it('category가 null이면 Database 반환', () => {
      expect(getBlockIcon(makeBlock({ category: null }))).toBe(Database);
    });

    it('category가 undefined이면 Database 반환', () => {
      expect(getBlockIcon(makeBlock({ category: undefined }))).toBe(Database);
    });

    it('category가 빈 문자열이면 Database 반환', () => {
      // BLOCK_CATEGORIES에 없는 값은 fallthrough
      expect(getBlockIcon(makeBlock({ category: '' as BlockCategory }))).toBe(Database);
    });
  });

  // ── 각 카테고리가 고유한 아이콘을 반환하는지 ──────────────────────────

  describe('카테고리별 아이콘 고유성', () => {
    it('모든 카테고리가 서로 다른 아이콘을 반환한다', () => {
      const categories: BlockCategory[] = [
        'animal', 'fitness', 'travel', 'coding', 'food', 'music',
        'study', 'health', 'work', 'game', 'finance', 'shopping',
        'home', 'sports', 'entertainment', 'person',
      ];

      const icons = categories.map((category) => getBlockIcon(makeBlock({ category })));
      const uniqueIcons = new Set(icons);

      expect(uniqueIcons.size).toBe(categories.length);
    });
  });
});
