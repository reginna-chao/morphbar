import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseHistoryReturn<T> {
  state: T;
  setLive: (next: T | ((prev: T) => T)) => void;
  commit: () => void;
  commitWith: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type Updater<T> = T | ((prev: T) => T);

interface HistoryInternal<T> {
  past: T[];
  present: T;
  future: T[];
}

type HistoryAction<T> =
  | { type: 'setLive'; updater: Updater<T> }
  | { type: 'commit'; nextOrSame?: Updater<T>; lastCommitted: T }
  | { type: 'undo' }
  | { type: 'redo' };

function isEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function makeReducer<T>(limit: number) {
  return (state: HistoryInternal<T>, action: HistoryAction<T>): HistoryInternal<T> => {
    switch (action.type) {
      case 'setLive': {
        const next =
          typeof action.updater === 'function'
            ? (action.updater as (p: T) => T)(state.present)
            : action.updater;
        if (Object.is(next, state.present)) return state;
        return { ...state, present: next };
      }
      case 'commit': {
        const next =
          action.nextOrSame === undefined
            ? state.present
            : typeof action.nextOrSame === 'function'
              ? (action.nextOrSame as (p: T) => T)(state.present)
              : action.nextOrSame;
        if (isEqual(next, action.lastCommitted)) {
          // No-op commit preserves future intentionally — nothing changed, so an
          // existing redo stack is still valid.
          return Object.is(next, state.present) ? state : { ...state, present: next };
        }
        const nextPast = [...state.past, action.lastCommitted];
        const trimmed =
          nextPast.length > limit ? nextPast.slice(nextPast.length - limit) : nextPast;
        return { past: trimmed, present: next, future: [] };
      }
      case 'undo': {
        if (state.past.length === 0) return state;
        const prev = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        return { past: newPast, present: prev, future: [...state.future, state.present] };
      }
      case 'redo': {
        if (state.future.length === 0) return state;
        const next = state.future[state.future.length - 1];
        const newFuture = state.future.slice(0, -1);
        return { past: [...state.past, state.present], present: next, future: newFuture };
      }
    }
  };
}

export function useHistory<T>(initial: T, limit: number = 50): UseHistoryReturn<T> {
  const reducer = useMemo(() => makeReducer<T>(limit), [limit]);
  const [state, dispatch] = useReducer(reducer, {
    past: [] as T[],
    present: initial,
    future: [] as T[],
  });
  const lastCommittedRef = useRef<T>(initial);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setLive = useCallback((updater: Updater<T>) => {
    dispatch({ type: 'setLive', updater });
  }, []);

  const commit = useCallback(() => {
    dispatch({ type: 'commit', lastCommitted: lastCommittedRef.current });
    // Optimistic update: lastCommittedRef should mirror the present we're
    // committing to. Acceptable to update outside the reducer since callers
    // sequence commits by event, not by render.
    lastCommittedRef.current = stateRef.current.present;
  }, []);

  const commitWith = useCallback((updater: Updater<T>) => {
    dispatch({ type: 'commit', nextOrSame: updater, lastCommitted: lastCommittedRef.current });
    const next =
      typeof updater === 'function' ? (updater as (p: T) => T)(stateRef.current.present) : updater;
    lastCommittedRef.current = next;
  }, []);

  const undo = useCallback(() => {
    const past = stateRef.current.past;
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    lastCommittedRef.current = prev;
    dispatch({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    const future = stateRef.current.future;
    if (future.length === 0) return;
    const next = future[future.length - 1];
    lastCommittedRef.current = next;
    dispatch({ type: 'redo' });
  }, []);

  return useMemo(
    () => ({
      state: state.present,
      setLive,
      commit,
      commitWith,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state.present, state.past.length, state.future.length, setLive, commit, commitWith, undo, redo]
  );
}
