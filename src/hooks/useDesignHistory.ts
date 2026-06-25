import { useCallback, useMemo } from 'react';
import { useHistory, isEqual, type UseHistoryReturn } from './useHistory';
import { adjustMirrorGroups, applyMirrorSync } from '@/utils/mirror';
import { snapLinesToGrid } from '@/utils/geometry';
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
  // Commit the result of a transform (rotate/translate/scale). Snaps the
  // transformed lines to the 0.5-unit grid before committing so integer coords
  // don't drift across repeated transforms. Pass the indices of the lines that
  // were transformed. Drag-end paths omit `lines` (the live `present` already
  // holds the un-snapped result). Button paths that compute the result and
  // commit in one synchronous batch pass `lines` explicitly to avoid a stale
  // present read.
  commitTransform: (indices: Set<number>, lines?: Lines) => void;
  // Returns true when the reset actually changed state, false when it was a
  // no-op (already at the initial design). Callers can use this to suppress a
  // "reset successful" toast that would otherwise lie.
  reset: (initialLines: Lines) => boolean;
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

  // Single choke point for all transform commits (drag-end + rotate buttons).
  // Snapping (0.5 grid) + mirror sync + commit happen here and only here.
  //
  // Drag-end paths omit `lines`: the live `present` already holds the un-snapped
  // transformed lines (pushed per-frame via setLines), so we read present, snap,
  // mirror-sync, and commit via commitWith.
  //
  // Button paths pass the freshly computed `lines`: they push the live frame and
  // commit in the same synchronous batch, so the reducer's `present` (and the
  // stateRef that commitWith reads) is still stale. We snap/sync the passed
  // value and commit it via commitValue, which sets lastCommittedRef from that
  // value — keeping the next diff base correct without reading the stale present.
  const commitTransform = useCallback(
    (indices: Set<number>, lines?: Lines) => {
      if (lines === undefined) {
        history.commitWith((snap) => {
          const snapped = snapLinesToGrid(snap.lines, indices);
          return { ...snap, lines: applyMirrorSync(snapped, snap.mirrorGroups) };
        });
        return;
      }
      const snap = history.state;
      const snapped = snapLinesToGrid(lines, indices);
      history.commitValue({ ...snap, lines: applyMirrorSync(snapped, snap.mirrorGroups) });
    },
    [history]
  );

  const reset = useCallback(
    (initialLines: Lines): boolean => {
      const current = history.state;
      const next: DesignSnapshot = {
        ...current,
        lines: structuredClone(initialLines),
        mirrorGroups: [],
      };
      if (isEqual(next, current)) return false;
      history.commitWith(next);
      return true;
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
      commitTransform,
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
      commitTransform,
      reset,
      loadTemplate,
    ]
  );

  return useMemo(() => ({ history, handlers }), [history, handlers]);
}
