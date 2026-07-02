import { useEffect, useRef } from "react";

/** Liefert den vorherigen Wert eines Props/States (nach dem letzten Render). */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
