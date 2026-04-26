import {
  Context,
  ForwardRefExoticComponent,
  MemoExoticComponent,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";
import type { SlotContextStore } from "./SlotContextStore";

// Base slot function type
export type Slot<T, E extends HTMLElement = HTMLElement> =
  | ((props: T) => ReactNode)
  | ForwardRefExoticComponent<PropsWithChildren<T> & RefAttributes<E>>
  | MemoExoticComponent<(props: T) => ReactNode>;

// Combined slot configuration
export interface SlotConfig<T = any> {
  component?: Slot<T>;
  isRequired?: boolean;
  multiple?: boolean;
  defaultContent?: ReactNode;
}

// ─── Dot-path utilities ───────────────────────────────────────────────────────

// Splits "Header.Title" → ["Header", "Title"]; "Body" → ["Body"]
type SplitPath<S extends string> =
  S extends `${infer Head}.${infer Tail}` ? [Head, ...SplitPath<Tail>] : [S];

// Builds { Header: { Title: Value } } from ["Header", "Title"] + Value
type BuildPath<Parts extends string[], Value> =
  Parts extends [infer Head, ...infer Tail]
    ? Tail extends string[]
      ? Tail extends []
        ? Head extends string ? { [K in Head]: Value } : never
        : Head extends string ? { [K in Head]: BuildPath<Tail, Value> } : never
      : never
    : never;

// Merges a union of object types into a single intersection
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

// ─── Slot component type extraction ──────────────────────────────────────────

// Extracts the props type from a callable component type.
type ComponentPropsOf<C> = C extends (props: infer P) => any
  ? P
  : { children?: ReactNode };

// Strips the call signature from a type, leaving only static properties (e.g. Title, Form).
type StaticPropsOf<C> = Omit<C, keyof ((...args: any[]) => any)>;

// The slot accessor type for a single slot config entry.
type SlotComponentFor<C extends SlotConfig> =
  C["component"] extends Slot<any>
    ? ((props: ComponentPropsOf<C["component"]> & { asChild?: boolean }) => ReactNode) &
        StaticPropsOf<C["component"]>
    : (props: { children?: ReactNode; asChild?: boolean }) => ReactNode;

/**
 * Derives the nested static property type from a slot config.
 * Plain keys ("Body") produce top-level properties; dot-path keys ("Header.Title")
 * produce nested properties (Component.Header.Title).
 */
export type ExtractSlotComponents<S extends Record<string, SlotConfig>> =
  UnionToIntersection<
    { [K in keyof S]: BuildPath<SplitPath<K & string>, SlotComponentFor<S[K]>> }[keyof S]
  >;

/**
 * Type utility: Determines the type of rendered slot content based on config.
 * The slots object in the render function is always keyed by the full dot-path
 * string (e.g. slots["Header.Title"]), never as a nested accessor.
 */
export type RenderedSlots<S extends Record<string, SlotConfig>> = {
  [K in keyof S]: S[K] extends { multiple: true }
    ? ReactNode[]
    : S[K] extends { component: infer C }
    ? ReactElement<ComponentPropsOf<C> & { asChild?: boolean }> | null
    : ReactNode;
};

// ─── prefixSlots / defineSlotGroup types ─────────────────────────────────────

/**
 * Maps { Title: SlotConfig } to { "Header.Title": SlotConfig } for a given prefix.
 */
export type PrefixedConfig<Prefix extends string, S extends Record<string, SlotConfig>> = {
  [K in keyof S as `${Prefix}.${K & string}`]: S[K];
};

// ─── Context types ────────────────────────────────────────────────────────────

/**
 * Marks a component as context-aware. The __storeContext property is the React
 * Context object through which useSlotContext retrieves the store instance.
 */
export type ContextComponent<C extends object> = {
  __storeContext: Context<SlotContextStore<C>>;
};

// ─── Builder interfaces ───────────────────────────────────────────────────────

/**
 * Builder interface returned by createComponentWithSlots when a context option is provided.
 * The render function receives provideContext in addition to slots and nonSlotChildren.
 */
export interface ComponentBuilderWithContext<S extends Record<string, SlotConfig>, C extends object> {
  render<T extends object = {}>(
    render: (
      props: T & {
        slots: RenderedSlots<S>;
        nonSlotChildren: ReactElement[];
        provideContext: (value: C) => void;
      },
    ) => ReactElement,
  ): React.FC<T & { children?: ReactNode }> & ExtractSlotComponents<S> & ContextComponent<C>;
}

/**
 * Builder interface returned by createComponentWithSlots.
 * Allows fluent API for defining component props after slots are configured.
 */
export interface ComponentBuilder<S extends Record<string, SlotConfig>> {
  /**
   * Define component render function with optional custom props.
   * @param render - Render function receiving props, slots, and nonSlotChildren
   *
   * @example
   * ```tsx
   * // Without custom props
   * .render(({ slots }) => <div>{slots.Header}</div>)
   *
   * // With custom props
   * .render<{ className: string }>(({ slots, className }) => <div>{slots.Header}</div>)
   * ```
   */
  render<T extends object = {}>(
    render: (
      props: T & {
        slots: RenderedSlots<S>;
        nonSlotChildren: ReactElement[];
      },
    ) => ReactElement,
  ): React.FC<T & { children?: ReactNode }> & ExtractSlotComponents<S>;
}
