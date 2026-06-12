import { cloneElement, ReactElement } from "react";

/**
 * Merges additional props into a filled slot element, or returns null if the slot is empty.
 * Useful when a parent component needs to pass layout-specific props (e.g. className) into
 * a slot after it has been collected.
 */
export function injectSlotProps<P>(
  slot: ReactElement<P> | null,
  props: Partial<P>
): ReactElement<P> | null {
  return slot ? cloneElement(slot, props) : null;
}
