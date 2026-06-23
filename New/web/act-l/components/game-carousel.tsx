'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CarouselScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export interface GameCarouselHandle {
  scrollBy: (delta: number) => void;
  scrollPage: () => number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

interface GameCarouselProps {
  children: ReactNode;
  className?: string;
  onScrollStateChange?: (state: CarouselScrollState) => void;
}

export const GameCarousel = forwardRef<GameCarouselHandle, GameCarouselProps>(
  function GameCarousel({ children, className, onScrollStateChange }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false, pointerId: -1 });
    const suppressClickRef = useRef(false);
    const DRAG_THRESHOLD = 8;

    const updateScrollButtons = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const left = scrollLeft > 4;
      const right = scrollLeft < scrollWidth - clientWidth - 4;
      setCanScrollLeft(left);
      setCanScrollRight(right);
      onScrollStateChange?.({ canScrollLeft: left, canScrollRight: right });
    }, [onScrollStateChange]);

    const scrollBy = useCallback((delta: number) => {
      scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
    }, []);

    const scrollPage = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return 320;
      return Math.max(240, Math.round(el.clientWidth * 0.7));
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        scrollBy,
        scrollPage,
        canScrollLeft,
        canScrollRight,
      }),
      [scrollBy, scrollPage, canScrollLeft, canScrollRight]
    );

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      updateScrollButtons();
      const raf = requestAnimationFrame(updateScrollButtons);
      const t = setTimeout(updateScrollButtons, 100);

      const onScroll = () => updateScrollButtons();
      el.addEventListener('scroll', onScroll, { passive: true });

      const ro = new ResizeObserver(() => updateScrollButtons());
      ro.observe(el);

      const onWheel = (e: WheelEvent) => {
        if (el.scrollWidth <= el.clientWidth) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        el.scrollLeft += delta;
      };

      const target = wrapRef.current ?? el;
      target.addEventListener('wheel', onWheel, { passive: false });

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
        el.removeEventListener('scroll', onScroll);
        target.removeEventListener('wheel', onWheel);
        ro.disconnect();
      };
    }, [updateScrollButtons, children]);

    const endDrag = (e: React.PointerEvent) => {
      const wasDrag = drag.current.moved;
      if (wasDrag) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
      if (drag.current.moved && scrollRef.current?.hasPointerCapture(e.pointerId)) {
        scrollRef.current.releasePointerCapture(e.pointerId);
      }
      drag.current = { active: false, startX: 0, scrollLeft: 0, moved: false, pointerId: -1 };
      setIsDragging(false);
      updateScrollButtons();
    };

    const onPointerDown = (e: React.PointerEvent) => {
      if (!scrollRef.current) return;
      if ((e.target as HTMLElement).closest('button')) return;
      drag.current = {
        active: true,
        startX: e.clientX,
        scrollLeft: scrollRef.current.scrollLeft,
        moved: false,
        pointerId: e.pointerId,
      };
    };

    const onPointerMove = (e: React.PointerEvent) => {
      if (!drag.current.active || !scrollRef.current) return;
      const dx = e.clientX - drag.current.startX;
      if (!drag.current.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        drag.current.moved = true;
        setIsDragging(true);
        scrollRef.current.setPointerCapture(drag.current.pointerId);
      }
      scrollRef.current.scrollLeft = drag.current.scrollLeft - dx;
    };

    const onPointerUp = (e: React.PointerEvent) => {
      if (!drag.current.active) return;
      endDrag(e);
    };

    const onClickCapture = (e: React.MouseEvent) => {
      if (suppressClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    return (
      <div
        ref={wrapRef}
        className={cn('relative group/carousel', className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {canScrollLeft && (isHovered || isDragging) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-zinc-900/95 border border-white/15 shadow-lg hover:bg-zinc-800"
            onClick={() => scrollBy(-scrollPage())}
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {canScrollRight && (isHovered || isDragging) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-zinc-900/95 border border-white/15 shadow-lg hover:bg-zinc-800"
            onClick={() => scrollBy(scrollPage())}
            aria-label="Przewiń w prawo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        <div
          ref={scrollRef}
          className={cn(
            'flex gap-3 md:gap-4 overflow-x-auto overflow-y-visible pb-2 carousel-scroll scroll-smooth-touch',
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClickCapture={onClickCapture}
        >
          {children}
        </div>
      </div>
    );
  }
);

export function CarouselItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}
