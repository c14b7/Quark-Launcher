'use client';

import {
  Gamepad2,
  Sword,
  Trophy,
  Heart,
  Star,
  Flame,
  Zap,
  Target,
  Rocket,
  Ghost,
  Skull,
  Music,
  BookOpen,
  Puzzle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CATEGORY_ICON_OPTIONS = [
  { id: 'gamepad2', label: 'Gamepad' },
  { id: 'sword', label: 'Sword' },
  { id: 'trophy', label: 'Trophy' },
  { id: 'heart', label: 'Heart' },
  { id: 'star', label: 'Star' },
  { id: 'flame', label: 'Flame' },
  { id: 'zap', label: 'Zap' },
  { id: 'target', label: 'Target' },
  { id: 'rocket', label: 'Rocket' },
  { id: 'ghost', label: 'Ghost' },
  { id: 'skull', label: 'Skull' },
  { id: 'music', label: 'Music' },
  { id: 'book', label: 'Book' },
  { id: 'puzzle', label: 'Puzzle' },
] as const;

export type CategoryIconId = (typeof CATEGORY_ICON_OPTIONS)[number]['id'];

const ICON_MAP: Record<CategoryIconId, LucideIcon> = {
  gamepad2: Gamepad2,
  sword: Sword,
  trophy: Trophy,
  heart: Heart,
  star: Star,
  flame: Flame,
  zap: Zap,
  target: Target,
  rocket: Rocket,
  ghost: Ghost,
  skull: Skull,
  music: Music,
  book: BookOpen,
  puzzle: Puzzle,
};

export const CATEGORY_COLOR_PRESETS = [
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
];

export function CategoryIcon({
  icon,
  color,
  className,
}: {
  icon?: string;
  color?: string;
  className?: string;
}) {
  const Icon = ICON_MAP[(icon as CategoryIconId) || 'gamepad2'] || Gamepad2;
  return (
    <Icon
      className={cn('h-5 w-5 shrink-0', className)}
      style={{ color: color || '#a1a1aa' }}
    />
  );
}
