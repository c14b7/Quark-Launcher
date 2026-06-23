'use client';

import { useRef, useState, ReactNode } from 'react';
import { GameCarousel, GameCarouselHandle, CarouselItem } from '@/components/game-carousel';
import { SectionHeader } from '@/components/section-header';

const CARD_WIDTH =
  'w-52 sm:w-56 md:w-60 lg:w-64 xl:w-72 2xl:w-80';

interface GameRowProps {
  title: ReactNode;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
}

export function GameRow({ title, icon, count, children }: GameRowProps) {
  const carouselRef = useRef<GameCarouselHandle>(null);
  const [scroll, setScroll] = useState({ canScrollLeft: false, canScrollRight: false });

  return (
    <section className="space-y-4 section-gap">
      <SectionHeader
        title={title}
        icon={icon}
        count={count}
        canScrollLeft={scroll.canScrollLeft}
        canScrollRight={scroll.canScrollRight}
        onScrollLeft={() => carouselRef.current?.scrollBy(-(carouselRef.current?.scrollPage() ?? 320))}
        onScrollRight={() => carouselRef.current?.scrollBy(carouselRef.current?.scrollPage() ?? 320)}
      />
      <GameCarousel ref={carouselRef} onScrollStateChange={setScroll}>
        {children}
      </GameCarousel>
    </section>
  );
}

export { CarouselItem, CARD_WIDTH };
