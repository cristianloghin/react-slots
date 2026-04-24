import { cloneElement, ReactElement } from "react";

export function injectSlotProps<P>(
  slot: ReactElement<P> | null,
  props: Partial<P>
): ReactElement<P> | null {
  return slot ? cloneElement(slot, props) : null;
}
