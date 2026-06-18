import { useCallback, useMemo } from 'react';
import { useHistory, type UseHistoryReturn } from './useHistory';
import { adjustMirrorGroups, applyMirrorSync } from '@/utils/mirror';
import type { Lines, MirrorGroup, StyleConfig, TemplateResult } from '@/types';

export interface DesignSnapshot {
  lines: Lines;
  mirrorGroups: MirrorGroup[];
  styleConfig: StyleConfig;
  horizontalShift: number;
}

export interface DesignHistoryHandlers {
  setLines: (lines: Lines) => void;
  commitLines: (lines: Lines) => void;
  setLinesMeta: (lines: Lines) => void;
  commitMirrorGroups: (groups: MirrorGroup[]) => void;
  setStyleConfig: (next: StyleConfig) => void;
  setHorizontalShift: (next: number) => void;
  commit: () => void;
  reset: (initialLines: Lines) => void;
  loadTemplate: (result: TemplateResult) => void;
}

// Apply a line change while keeping mirror groups consistent. When a line is
// removed, drop or shift any groups referencing it.
function reconcileLines(snap: DesignSnapshot, newLines: Lines): DesignSnapshot {
  if (newLines.length === snap.lines.length) {
    return { ...snap, lines: applyMirrorSync(newLines, snap.mirrorGroups) };
  }

  const oldLength = snap.lines.length;
  const newLength = newLines.length;
  let updatedGroups = snap.mirrorGroups;

  if (newLength < oldLength) {
    if (oldLength - newLength === 1) {
      let removedIndex = -1;
      for (let i = 0; i < oldLength; i++) {
        const before = JSON.stringify(snap.lines[i]);
        const after = i < newLength ? JSON.stringify(newLines[i]) : null;
        if (after !== before) {
          removedIndex = i;
          break;
        }
      }
      if (removedIndex === -1) removedIndex = oldLength - 1;
      updatedGroups = adjustMirrorGroups(snap.mirrorGroups, removedIndex);
    } else {
      updatedGroups = [];
    }
  }

  return {
    ...snap,
    lines: applyMirrorSync(newLines, updatedGroups),
    mirrorGroups: updatedGroups,
  };
}

export interface UseDesignHistoryReturn {
  history: UseHistoryReturn<DesignSnapshot>;
  handlers: DesignHistoryHandlers;
}

export function useDesignHistory(initial: DesignSnapshot): UseDesignHistoryReturn {
  const history = useHistory<DesignSnapshot>(initial);

  const setLines = useCallback(
    (newLines: Lines) => {
      history.setLive((snap) => reconcileLines(snap, newLines));
    },
    [history]
  );

  const commitLines = useCallback(
    (newLines: Lines) => {
      history.commitWith((snap) => reconcileLines(snap, newLines));
    },
    [history]
  );

  // Metadata-only setter (color/strokeWidth) — skips mirror-sync because
  // metadata changes don't affect path geometry.
  const setLinesMeta = useCallback(
    (newLines: Lines) => {
      history.setLive((snap) => ({ ...snap, lines: newLines }));
    },
    [history]
  );

  const commitMirrorGroups = useCallback(
    (groups: MirrorGroup[]) => {
      history.commitWith((snap) => ({
        ...snap,
        mirrorGroups: groups,
        lines: applyMirrorSync(snap.lines, groups),
      }));
    },
    [history]
  );

  const setStyleConfig = useCallback(
    (next: StyleConfig) => {
      history.setLive((snap) => ({ ...snap, styleConfig: next }));
    },
    [history]
  );

  const setHorizontalShift = useCallback(
    (next: number) => {
      history.setLive((snap) => ({ ...snap, horizontalShift: next }));
    },
    [history]
  );

  const commit = useCallback(() => {
    history.commit();
  }, [history]);

  const reset = useCallback(
    (initialLines: Lines) => {
      history.commitWith((snap) => ({
        ...snap,
        lines: structuredClone(initialLines),
        mirrorGroups: [],
      }));
    },
    [history]
  );

  const loadTemplate = useCallback(
    (result: TemplateResult) => {
      history.commitWith((snap) => ({
        ...snap,
        lines: result.lines,
        mirrorGroups: [],
        styleConfig: result.styleOverrides
          ? { ...snap.styleConfig, ...result.styleOverrides }
          : snap.styleConfig,
      }));
    },
    [history]
  );

  const handlers: DesignHistoryHandlers = useMemo(
    () => ({
      setLines,
      commitLines,
      setLinesMeta,
      commitMirrorGroups,
      setStyleConfig,
      setHorizontalShift,
      commit,
      reset,
      loadTemplate,
    }),
    [
      setLines,
      commitLines,
      setLinesMeta,
      commitMirrorGroups,
      setStyleConfig,
      setHorizontalShift,
      commit,
      reset,
      loadTemplate,
    ]
  );

  return useMemo(() => ({ history, handlers }), [history, handlers]);
}
