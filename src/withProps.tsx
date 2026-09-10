import {
  forwardRef,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  ReactNode,
  RefAttributes,
} from "react";
import { refProp } from "./refProp";

// The element a forwardRef component exposes, read off its props type;
// `unknown` for components that declare no ref.
type RefOf<P> = P extends RefAttributes<infer E> ? E : unknown;

/**
 * The component `withProps` returns: a forwardRef component whose bound keys
 * are optional. A `ref` passes through to the wrapped component.
 */
export type BoundComponent<
  P extends object,
  K extends keyof P,
> = ForwardRefExoticComponent<
  PropsWithoutRef<Omit<P, K> & Partial<Pick<P, K>>> & RefAttributes<RefOf<P>>
>;

/**
 * Bound props become optional rather than removed: the runtime spreads caller
 * props over the bound ones, so a caller — including injectSlotProps at the
 * layout's render site — may override a bound prop, and the type says so.
 *
 * The wrapped component is rendered as an element, never called as a
 * function, so it may be a plain function, a `forwardRef` or a `memo`
 * component — the latter two are objects, not callables — and its hooks run
 * in its own component instance. The ref is forwarded to it.
 */
export function withProps<P extends object, K extends keyof P>(
  Component: (props: P) => ReactNode,
  boundProps: Pick<P, K>,
): BoundComponent<P, K> {
  const Base = Component as any;
  const Bound = forwardRef<RefOf<P>, any>(function WithProps(props, ref) {
    return <Base {...boundProps} {...props} {...refProp(ref)} />;
  });
  return Bound as unknown as BoundComponent<P, K>;
}
