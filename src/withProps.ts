import { ReactNode } from "react";

/**
 * Bound props become optional rather than removed: the runtime spreads caller
 * props over the bound ones, so a caller — including injectSlotProps at the
 * layout's render site — may override a bound prop, and the type says so.
 */
export function withProps<P extends object, K extends keyof P>(
  Component: (props: P) => ReactNode,
  boundProps: Pick<P, K>,
): (props: Omit<P, K> & Partial<Pick<P, K>>) => ReactNode {
  return (props) => Component({ ...boundProps, ...props } as unknown as P);
}
