'use client';

import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface UserCard3DProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}

export function UserCard3D({ children, className, maxTilt = 10 }: UserCard3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - y) * maxTilt * 2;
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    });
  };

  const handleLeave = () => {
    setStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn('transition-transform duration-200 ease-out will-change-transform', className)}
      style={style}
    >
      {children}
    </div>
  );
}
