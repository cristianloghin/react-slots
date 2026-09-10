import { ForwardedRef } from "react";

// Spread-friendly ref: adds `ref` only when the caller gave one, so a plain
// function component never sees a stray `ref: null` prop on React 19 and
// React 18 never warns about a ref on a component that cannot take one.
export function refProp<E>(
  ref: ForwardedRef<E>,
): { ref: ForwardedRef<E> } | undefined {
  return ref === null ? undefined : { ref };
}
