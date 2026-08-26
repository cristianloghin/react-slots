import { isValidElement, ReactElement, ReactNode } from "react";

/**
 * Reads a value from the props of every element in a slot, uniformly over
 * single slots (`ReactElement | null`) and multiple slots (`ReactElement[]`).
 * Returns one selected value per collected element, in collection order, and
 * an empty array for an unfilled slot — so presence and value checks compose
 * with ordinary array methods:
 *
 * ```tsx
 * const isFormOpen = getSlotProps(slots.Form, (p) => p.open).some(Boolean);
 * ```
 *
 * The selector runs during render, so the result is always the current
 * committed props — reactivity comes from ordinary top-down prop flow, no
 * subscription involved.
 *
 * Caveats:
 * - `asChild` dissolves the slot wrapper: the collected element is the child,
 *   whose props need not match the slot component's prop type.
 * - Portal slots resolve to a live boundary element, not the registered
 *   content; reading its props is meaningless.
 * - `defaultContent` for a componentless slot is wrapped in a Fragment, whose
 *   props are not the slot component's either.
 */
export function getSlotProps<P, T>(
  slot: ReactElement<P> | readonly ReactElement<P>[] | null | undefined,
  select: (props: P) => T,
): T[];
export function getSlotProps<P, T>(
  slot: ReactNode | readonly ReactNode[],
  select: (props: P) => T,
): T[];
export function getSlotProps<P, T>(
  slot: ReactNode | readonly ReactNode[],
  select: (props: P) => T,
): T[] {
  if (slot === null || slot === undefined) return [];
  const entries = Array.isArray(slot) ? slot : [slot];
  return entries
    .filter((entry): entry is ReactElement<P> => isValidElement(entry))
    .map((element) => select(element.props));
}
