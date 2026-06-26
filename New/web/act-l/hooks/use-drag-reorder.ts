import { useCallback, useState, type DragEvent } from 'react';

export function useDragReorder<T extends string>(items: T[]) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const onDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (index: number, onReorder: (from: number, to: number) => void) => {
      if (dragIndex === null || dragIndex === index) return;
      onReorder(dragIndex, index);
      setDragIndex(null);
    },
    [dragIndex]
  );

  const onDragEnd = useCallback(() => setDragIndex(null), []);

  return { dragIndex, onDragStart, onDragOver, onDrop, onDragEnd };
}
