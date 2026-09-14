import { useContext, useSyncExternalStore } from "react";
import type { SlotContext } from "./createSlotContext";

/**
 * Reads a value from a slot context provided by the nearest layout instance
 * that declares it. Outside any such instance, the context's defaults are
 * returned.
 *
 * The selector form is preferred — it re-renders the caller only when the
 * selected value changes, not on every context update.
 *
 * @example
 * ```tsx
 * const open = useSlotContext(PanelContext, (s) => s.open); // selector
 * const ctx = useSlotContext(PanelContext);                 // whole value
 * ```
 */
export function useSlotContext<C extends object, T>(
  context: SlotContext<C>,
  selector: (value: C) => T,
): T;
export function useSlotContext<C extends object>(context: SlotContext<C>): C;
export function useSlotContext<C extends object, T = C>(
  context: SlotContext<C>,
  selector?: (value: C) => T,
): T | C {
  const store = useContext(context.__storeContext);
  const getSnapshot = selector
    ? () => selector(store.get())
    : () => store.get() as unknown as T;
  return useSyncExternalStore((notify) => store.subscribe(notify), getSnapshot, getSnapshot);
}
