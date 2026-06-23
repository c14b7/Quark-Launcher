'use client';

import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SectionHeaderProps {
  title: ReactNode;
  icon?: ReactNode;
  count?: number;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  canScrollLeft?: boolean;
  canScrollRight?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  icon,
  count,
  onScrollLeft,
  onScrollRight,
  canScrollLeft = false,
  canScrollRight = false,
  className,
}: SectionHeaderProps) {
  const showArrows = onScrollLeft && onScrollRight;

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="text-xl font-bold tracking-tight text-white/90 flex items-center gap-2 drop-shadow-md min-w-0">
        {icon}
        <span className="truncate">{title}</span>
        {count !== undefined && (
          <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full shrink-0">
            {count}
          </span>
        )}
      </h2>
      {showArrows && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-lg border border-white/10',
              !canScrollLeft && 'opacity-30 pointer-events-none'
            )}
            onClick={onScrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-lg border border-white/10',
              !canScrollRight && 'opacity-30 pointer-events-none'
            )}
            onClick={onScrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
