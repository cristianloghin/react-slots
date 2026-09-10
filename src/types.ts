import type {
  ComponentProps,
  ForwardRefExoticComponent,
  JSXElementConstructor,
  PropsWithoutRef,
  ReactElement,
  ReactNode,
  Ref,
  RefAttributes,
} from "react";

// ─── Slot definitions ────────────────────────────────────────────────────────

export const SLOT_BRAND: unique symbol = Symbol("rst.slot");

/** Any component usable as a slot's `component`: plain, forwardRef or memo. */
export type AnyComponent = JSXElementConstructor<any>;

/** Options shared by every slot. */
export interface BaseSlotOptions {
  /** Log a development error when the slot is left unfilled. */
  required?: boolean;
  /** Collect every fill instead of the last one. */
  multiple?: boolean;
  /** Rendered in the slot's place when it is unfilled. Does not count as filled. */
  fallback?: ReactNode;
  /**
   * A portal slot is not collected from the layout's direct children. Any fill
   * mounted anywhere beneath the layout — including across a router outlet —
   * registers its content, which the layout renders at the slot's position.
   */
  portal?: boolean;
}

/** Options for a slot with no component: fills render their children bare. */
export interface BareSlotOptions extends BaseSlotOptions {
  component?: undefined;
  props?: undefined;
}

/** Options for a slot backed by a component. */
export interface ComponentSlotOptions<C extends AnyComponent>
  extends BaseSlotOptions {
  /** Wraps every fill. Its static properties (nested slots) are exposed on the fill. */
  component: C;
  /** Props bound at definition time. A fill may still override them. */
  props?: Partial<ComponentProps<C>>;
}

export type SlotOptions = BareSlotOptions | ComponentSlotOptions<AnyComponent>;

/** A slot definition, created by `slot()`. */
export interface SlotDef<O extends SlotOptions = SlotOptions> {
  readonly [SLOT_BRAND]: true;
  readonly options: O;
}

/** A slot config: slot definitions, nested arbitrarily deep in plain objects. */
export type SlotTree = { readonly [name: string]: SlotDef | SlotTree };

// ─── Type helpers ────────────────────────────────────────────────────────────

type PropsOf<C> = C extends AnyComponent ? ComponentProps<C> : never;

/** Static properties of a component (its nested slot accessors), minus React's own keys. */
export type Statics<C> = Omit<
  C,
  | keyof Function
  | "$$typeof"
  | "displayName"
  | "defaultProps"
  | "propTypes"
  | "contextTypes"
  | "render"
  | "type"
  | "compare"
>;

type BoundKeys<O, P> = O extends { props: infer B } ? keyof B & keyof P : never;

/** The props of the element a fill produces, as seen by the layout. */
export type FillElementProps<O> = O extends { component: infer C }
  ? PropsOf<C>
  : { children?: ReactNode };

/**
 * Props accepted by a fill component at the call site. `children` may be a
 * function of the fill itself, so a fill written in another file can address
 * the nested fills (`(h) => <h.Title>…</h.Title>`) without importing the layout;
 * annotate the parameter as `typeof Page.Header`.
 */
export type FillProps<O> = O extends { component: infer C }
  ? Omit<PropsOf<C>, "children" | BoundKeys<O, PropsOf<C>>> &
      Partial<Pick<PropsOf<C>, BoundKeys<O, PropsOf<C>>>> & {
        asChild?: boolean;
        children?: ReactNode | ((fill: Fill<O>) => ReactNode);
      }
  : {
      asChild?: boolean;
      children?: ReactNode | ((fill: Fill<O>) => ReactNode);
    };

/** The fill component for one slot: callable, plus the component's nested slots. */
export type Fill<O> = ((props: FillProps<O>) => ReactNode) &
  (O extends { component: infer C } ? Statics<C> : {});

/** The nested accessor tree attached to a layout: `Page.Header.Title`. */
export type Accessors<S> = {
  readonly [K in keyof S]: S[K] extends SlotDef<infer O>
    ? Fill<O>
    : Accessors<S[K]>;
};

// ─── Slot handles (render side) ──────────────────────────────────────────────

/**
 * A single-value slot as seen by the layout. Render it directly (`{slots.X}`),
 * or use its members to read and adapt the collected fill.
 */
export interface SingleHandle<P> extends Iterable<ReactNode> {
  /** True when a fill was collected. `fallback` does not count. */
  readonly filled: boolean;
  /** The collected element, or null. */
  readonly element: ReactElement<P> | null;
  /** The collected element's props, or undefined. */
  readonly props: P | undefined;
  /** Render the fill with extra props merged in (the fallback when unfilled). */
  render(extra: Partial<P>): ReactNode;
  /** Render around the content; receives null when unfilled. */
  when(render: (content: ReactNode) => ReactNode): ReactNode;
}

/** A `multiple` slot as seen by the layout. */
export interface MultiHandle<P> extends Iterable<ReactNode> {
  /** True when at least one fill was collected. */
  readonly filled: boolean;
  /** The collected elements, in call-site order. */
  readonly elements: ReactElement<P>[];
  /** The props of every collected element, in order. */
  readonly props: P[];
  /** Render every fill with extra props merged in (the fallback when unfilled). */
  render(extra: Partial<P>): ReactNode;
  /** Render around the content; receives null when unfilled. */
  when(render: (content: ReactNode) => ReactNode): ReactNode;
}

/**
 * A portal slot as seen by the layout. Its content arrives after commit, so
 * presence is only observable through `when`, which subscribes a leaf element
 * to the slot and re-renders just that leaf on fill/unfill.
 */
export interface PortalHandle extends Iterable<ReactNode> {
  when(render: (content: ReactNode) => ReactNode): ReactNode;
}

export type HandleOf<D> = D extends SlotDef<infer O>
  ? O extends { portal: true }
    ? PortalHandle
    : O extends { multiple: true }
      ? MultiHandle<FillElementProps<O>>
      : SingleHandle<FillElementProps<O>>
  : GroupHandle<D>;

/**
 * A group of slots as seen by the layout. Render it directly to emit every
 * slot in config order, check `filled` for "any slot in this group", or wrap
 * the group's content with `when`.
 */
export type GroupHandle<S> = Iterable<ReactNode> & {
  readonly filled: boolean;
  /** Render around the group's content; receives null when no slot is filled. */
  when(render: (content: ReactNode) => ReactNode): ReactNode;
} & { readonly [K in keyof S]: HandleOf<S[K]> };

// ─── Layout ──────────────────────────────────────────────────────────────────

/** What the render function receives besides the caller's props. */
export interface LayoutApi<S extends SlotTree> {
  /** The collected slots, mirroring the config's shape. */
  slots: GroupHandle<S>;
  /** Children that are not slot fills, in order. */
  children: ReactNode[];
}

export interface LayoutApiWithContext<S extends SlotTree, C extends object>
  extends LayoutApi<S> {
  /** Publish the context value for this instance. Call on every render. */
  provide: (value: C) => void;
}

// Non-distributive on purpose: `Ref<E>` is a union including `null`, and a
// distributive check would yield `unknown` for that member and swallow `E`.
type RefOf<T> = T extends { ref?: infer R }
  ? [NonNullable<R>] extends [Ref<infer E>]
    ? E
    : unknown
  : unknown;

/**
 * The component `createLayout` returns. Declare `ref?: Ref<E>` in the props
 * type to receive the call-site ref as `props.ref` and to type it externally.
 */
export type Layout<S extends SlotTree, T extends object> = ForwardRefExoticComponent<
  PropsWithoutRef<T> & { children?: ReactNode } & RefAttributes<RefOf<T>>
> &
  Accessors<S>;
