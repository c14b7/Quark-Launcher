'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOUR_KEY = 'quark_app_tour_complete';

export const TOUR_STEPS = [
  {
    id: 'nav',
    target: '[data-tour="nav"]',
    title: 'Nawigacja',
    body: 'Przełączaj się między Home, Biblioteką, Aktualnościami i kontem.',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Wyszukiwarka',
    body: 'Szybko znajdź grę po nazwie — filtruje listę po lewej stronie.',
  },
  {
    id: 'games',
    target: '[data-tour="game-list"]',
    title: 'Twoje gry',
    body: 'Kliknij grę, aby zobaczyć statystyki, osiągnięcia i uruchomić ją.',
  },
  {
    id: 'friends',
    target: '[data-tour="friends"]',
    title: 'Znajomi Quark',
    body: 'Zobacz kto jest online i w co gra. Dodawaj znajomych kodem Quark.',
  },
  {
    id: 'settings',
    target: '[data-tour="settings"]',
    title: 'Ustawienia',
    body: 'Motyw, kategorie gier, prywatność i telemetria — wszystko tutaj.',
  },
  {
    id: 'categories',
    target: '[data-tour="settings"]',
    title: 'Kategorie gier',
    body: 'W Ustawieniach → Kategorie utwórz własne listy (np. RPG, Do końca). Dodaj grę do kategorii przez menu ⋯ w szczegółach gry.',
  },
  {
    id: 'overlay',
    target: '[data-tour="titlebar"]',
    title: 'Nakładka w grze',
    body: 'Po uruchomieniu gry naciśnij Ctrl+Alt+F10, aby pokazać logo Quark w rogu ekranu.',
  },
] as const;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad = 8;
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

interface AppTourProps {
  active: boolean;
  onComplete: () => void;
}

export function AppTour({ active, onComplete }: AppTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const updateRect = useCallback(() => {
    if (!active || !step) return;
    setRect(getTargetRect(step.target));
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    const t = setInterval(updateRect, 400);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearInterval(t);
    };
  }, [active, stepIndex, updateRect]);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    onComplete();
  };

  const next = () => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  if (!active || !step) return null;

  const tooltipTop = rect ? Math.min(rect.top + rect.height + 16, window.innerHeight - 200) : window.innerHeight / 2;
  const tooltipLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 340) : 16;

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] pointer-events-auto"
      >
        {rect && (
          <div
            className="absolute rounded-xl transition-all duration-300 ease-out pointer-events-none"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
            }}
          />
        )}

        {!rect && <div className="absolute inset-0 bg-black/75" />}

        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute w-[320px] bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl"
          style={{ top: tooltipTop, left: tooltipLeft }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold mb-1">
                Krok {stepIndex + 1} / {TOUR_STEPS.length}
              </p>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            </div>
            <button
              type="button"
              onClick={finish}
              className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/5"
              aria-label="Pomiń tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed mb-5">{step.body}</p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === stepIndex ? 'w-4 bg-violet-500' : 'w-1.5 bg-zinc-700'
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={prev} className="h-8 rounded-lg">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" onClick={next} className="h-8 rounded-lg bg-violet-600 hover:bg-violet-500 gap-1">
                {isLast ? 'Gotowe' : 'Dalej'}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function shouldShowAppTour(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TOUR_KEY) !== 'true';
}

export function resetAppTour(): void {
  localStorage.removeItem(TOUR_KEY);
}
