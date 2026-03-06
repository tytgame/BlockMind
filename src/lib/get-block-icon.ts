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
  type LucideIcon,
} from 'lucide-react';
import type { Block, BlockCategory } from '@/types/block';

const CATEGORY_ICON_MAP: Record<BlockCategory, LucideIcon> = {
  animal:        PawPrint,
  fitness:       Dumbbell,
  travel:        Plane,
  coding:        Code2,
  food:          UtensilsCrossed,
  music:         Music,
  study:         BookOpen,
  health:        Heart,
  work:          Briefcase,
  game:          Gamepad2,
  finance:       DollarSign,
  shopping:      ShoppingBag,
  home:          Home,
  sports:        Trophy,
  entertainment: Film,
  person:        User,
};

const CATEGORY_COLOR_MAP: Record<BlockCategory, string> = {
  animal:        'text-amber-400',
  fitness:       'text-orange-400',
  travel:        'text-sky-400',
  coding:        'text-emerald-400',
  food:          'text-yellow-400',
  music:         'text-purple-400',
  study:         'text-blue-400',
  health:        'text-rose-400',
  work:          'text-slate-300',
  game:          'text-violet-400',
  finance:       'text-green-400',
  shopping:      'text-pink-400',
  home:          'text-amber-300',
  sports:        'text-lime-400',
  entertainment: 'text-red-400',
  person:        'text-cyan-400',
};

export function getBlockIconColor(block: Block): string {
  if (block.type === 'image') return 'text-teal-400';
  if (block.type === 'file') {
    const mime = block.fileType ?? '';
    if (mime === 'application/pdf') return 'text-red-400';
    if (mime.includes('text') || mime.includes('word') || mime.includes('document')) return 'text-blue-400';
    return 'text-gray-400';
  }
  if (block.category && block.category in CATEGORY_COLOR_MAP) {
    return CATEGORY_COLOR_MAP[block.category as BlockCategory];
  }
  return 'text-gray-400';
}

export function getBlockIcon(block: Block): LucideIcon {
  if (block.type === 'image') return ImageIcon;

  if (block.type === 'file') {
    const mime = block.fileType ?? '';
    if (mime === 'application/pdf') return FileType2;
    if (mime.includes('text') || mime.includes('word') || mime.includes('document')) return FileText;
    return File;
  }

  // data 타입: category 기반
  if (block.category && block.category in CATEGORY_ICON_MAP) {
    return CATEGORY_ICON_MAP[block.category as BlockCategory];
  }

  return Database;
}
