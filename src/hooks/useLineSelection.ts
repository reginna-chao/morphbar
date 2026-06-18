import { useCallback, useState } from 'react';

interface UseLineSelectionResult {
  selected: Set<number>;
  isLineSelected: (i: number) => boolean;
  selectSingle: (i: number) => void;
  toggleLine: (i: number) => void;
  clear: () => void;
  prune: (linesLength: number, mirrorTargets: Set<number>) => void;
}

export function useLineSelection(): UseLineSelectionResult {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const isLineSelected = useCallback((i: number) => selected.has(i), [selected]);

  const selectSingle = useCallback((i: number) => {
    setSelected(new Set([i]));
  }, []);

  const toggleLine = useCallback((i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const prune = useCallback((linesLength: number, mirrorTargets: Set<number>) => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i >= linesLength || mirrorTargets.has(i)) {
          changed = true;
          return;
        }
        next.add(i);
      });
      return changed ? next : prev;
    });
  }, []);

  return { selected, isLineSelected, selectSingle, toggleLine, clear, prune };
}
