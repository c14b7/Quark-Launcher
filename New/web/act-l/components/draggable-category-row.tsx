'use client';

import { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { GameRow } from '@/components/game-row';
import { cn } from '@/lib/utils';
import { useDragReorder } from '@/hooks/use-drag-reorder';

interface DraggableCategoryRowProps {
  categoryId: string;
  categoryIndex: number;
  title: ReactNode;
  icon?: ReactNode;
  count?: number;
  onCategoryReorder: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
}

export function DraggableCategoryRow({
  categoryId,
  categoryIndex,
  title,
  icon,
  count,
  onCategoryReorder,
  children,
}: DraggableCategoryRowProps) {
  const { dragIndex, onDragStart, onDragOver, onDrop, onDragEnd } = useDragReorder<string>([categoryId]);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', categoryId);
        onDragStart(categoryIndex);
      }}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(categoryIndex, onCategoryReorder);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-xl transition-opacity',
        dragIndex === categoryIndex && 'opacity-60 ring-1 ring-violet-500/40'
      )}
    >
      <div className="flex items-center gap-1 -mb-2 pl-1">
        {/* <GripVertical className="h-4 w-4 text-zinc-600 cursor-grab active:cursor-grabbing shrink-0" /> */}
        {/* <span className="text-[10px] uppercase tracking-wider text-zinc-600">Przeciągnij sekcję</span> */}
      </div>
      <GameRow title={title} icon={icon} count={count}>
        {children}
      </GameRow>
    </div>
  );
}
