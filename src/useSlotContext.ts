import { useContext, useSyncExternalStore } from "react";
import type { ContextComponent } from "./types";

/**
 * Reads a value from the typed slot context of a layout component.
 *
 * The selector form is strongly preferred — it re-renders the caller only when
 * the selected value changes, not on every context update.
 *
 * @example
 * ```tsx
 * // Selector — re-renders only when `open` changes
 * const open = useSlotContext(Dialog, s => s.open)
 *
 * // Full shape — re-renders on any context update
 * const ctx = useSlotContext(Dialog)
 * ```
 */
export function useSlotContext<C extends object, T>(
  layout: ContextComponent<C>,
  selector: (value: C) => T,
): T;

export function useSlotContext<C extends object>(
  layout: ContextComponent<C>,
): C;

export function useSlotContext<C extends object, T = C>(
  layout: ContextComponent<C>,
  selector?: (value: C) => T,
): T | C {
  const store = useContext(layout.__storeContext);
  return useSyncExternalStore(
    (notify) => store.subscribe(notify),
    selector ? () => selector(store.get()) : () => store.get(),
  );
}
