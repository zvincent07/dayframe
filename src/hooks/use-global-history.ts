import { useState, useCallback } from "react";

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useGlobalHistory<T>(initial: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);

  const update = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setPast((p) => [...p, present]);
    setFuture([]);
    setPresent((prev) => (typeof updater === "function" ? (updater as (p: T) => T)(prev) : { ...prev, ...updater }));
  }, [present]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [present, ...f]);
      setPresent(previous);
      return p.slice(0, -1);
    });
  }, [present]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, present]);
      setPresent(next);
      return f.slice(1);
    });
  }, [present]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return {
    past,
    present,
    future,
    update,
    undo,
    redo,
    canUndo,
    canRedo,
    setPresent, // exposed for controlled resets if needed
  };
}
