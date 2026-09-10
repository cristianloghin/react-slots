import { Context, createContext } from "react";
import { SlotContextStore } from "./SlotContextStore";

export const SLOT_CONTEXT_BRAND: unique symbol = Symbol("rst-slot-context");

/**
 * A standalone slot context created by `createSlotContext`. A layout declares
 * it with `createLayout(config, { context }, render)` and fills read it with
 * `useSlotContext(context, selector)`.
 */
export interface SlotContext<C extends object> {
  readonly [SLOT_CONTEXT_BRAND]: true;
  readonly __storeContext: Context<SlotContextStore<C>>;
  readonly __defaults: C;
}

/**
 * Creates a slot context: a typed value a layout instance provides to every
 * fill beneath it. The context is its own module-level value, so a fill in a
 * separate file imports the context rather than the layout, which keeps the
 * module graph acyclic.
 *
 * @param defaults - The value read outside any providing layout instance. Match
 *   it to the layout's initial state to avoid a one-frame mismatch.
 *
 * @example
 * ```tsx
 * // panelContext.ts — leaf module
 * export const PanelContext = createSlotContext({ open: false, toggle: () => {} });
 *
 * // Panel.tsx
 * const Panel = createLayout(
 *   { Header: slot({ component: PanelHeader }), Body: slot() },
 *   { context: PanelContext },
 *   (_, { slots, provide }) => {
 *     const [open, setOpen] = useState(false);
 *     provide({ open, toggle: () => setOpen((o) => !o) });
 *     return <div>{slots.Header}{open && slots.Body}</div>;
 *   },
 * );
 *
 * // PanelHeader.tsx — imports the context, not the layout
 * const open = useSlotContext(PanelContext, (s) => s.open);
 * ```
 */
export function createSlotContext<C extends object>(
  defaults: C,
): SlotContext<C> {
  return {
    [SLOT_CONTEXT_BRAND]: true,
    __storeContext: createContext<SlotContextStore<C>>(
      new SlotContextStore<C>(defaults),
    ),
    __defaults: defaults,
  };
}

export function isSlotContext(value: object): value is SlotContext<object> {
  return SLOT_CONTEXT_BRAND in value;
}
