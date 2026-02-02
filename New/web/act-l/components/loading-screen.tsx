'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function LoadingScreen({ onComplete, minDuration = 2000 }: LoadingScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for exit animation to complete
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-500",
        isExiting && "opacity-0"
      )}
    >
      {/* Animated gradient background with blur */}
      <div className="absolute inset-0 bg-zinc-950">
        {/* Floating blobs */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full animate-float-blob"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(99, 102, 241, 0.3) 50%, transparent 70%)',
            top: '10%',
            left: '20%',
            filter: 'blur(80px)',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full animate-float-blob-2"
          style={{
            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.5) 0%, rgba(139, 92, 246, 0.25) 50%, transparent 70%)',
            bottom: '10%',
            right: '15%',
            filter: 'blur(100px)',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full animate-float-blob-3"
          style={{
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(67, 56, 202, 0.2) 50%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(120px)',
          }}
        />
        {/* Additional smaller blobs for depth */}
        <div 
          className="absolute w-[300px] h-[300px] rounded-full animate-float-blob"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 60%)',
            top: '60%',
            left: '10%',
            filter: 'blur(60px)',
            animationDelay: '-5s',
          }}
        />
        <div 
          className="absolute w-[350px] h-[350px] rounded-full animate-float-blob-2"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 60%)',
            top: '20%',
            right: '10%',
            filter: 'blur(70px)',
            animationDelay: '-10s',
          }}
        />
      </div>

      {/* Logo text */}
      <div className="relative z-10 flex flex-col items-center">
        <h1 
          className="font-logo text-8xl md:text-9xl text-white animate-pulse-glow tracking-wider"
          style={{
            fontFamily: "'Hedvig Letters Sans', sans-serif",
          }}
        >
          Quark
        </h1>
        
        {/* Subtle loading indicator */}
        <div className="mt-8 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
