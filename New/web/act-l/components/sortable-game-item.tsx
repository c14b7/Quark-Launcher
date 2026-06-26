'use client';

import { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDragReorder } from '@/hooks/use-drag-reorder';

interface SortableGameItemProps {
  id: string;
  index: number;
  enabled?: boolean;
  className?: string;
  onReorder: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
}

export function SortableGameItem({
  id,
  index,
  enabled = true,
  className,
  onReorder,
  children,
}: SortableGameItemProps) {
  const { dragIndex, onDragStart, onDragOver, onDrop, onDragEnd } = useDragReorder<string>([id]);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        onDragStart(index);
      }}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index, onReorder);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'relative group/sort',
        dragIndex === index && 'opacity-50 scale-[0.98]',
        className
      )}
    >
      <div
        className="absolute left-1 top-1 z-20 p-1 rounded-md bg-black/50 opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Przeciągnij aby zmienić kolejność"
      >
        <GripVertical className="h-3.5 w-3.5 text-zinc-300" />
      </div>
      {children}
    </div>
  );
}
