import { Context, createContext } from "react";
import { SlotContextStore } from "./SlotContextStore";

export const SLOT_CONTEXT_BRAND: unique symbol = Symbol("rst-slot-context");

/**
 * A standalone slot context created by `createSlotContext`. Structurally a
 * `ContextComponent`, so it can be passed to `useSlotContext` directly.
 */
export interface SlotContext<C extends object> {
  readonly [SLOT_CONTEXT_BRAND]: true;
  readonly __storeContext: Context<SlotContextStore<C>>;
  readonly __defaults: C;
}

/**
 * Creates a slot context that lives independently of the layout that provides
 * it. Pass it to `createComponentWithSlots(config, { context })` in place of a
 * plain defaults object, and consume it with `useSlotContext(theContext, …)`.
 *
 * Use this whenever a slot component lives in its own module: the layout's
 * slot config reads component bindings eagerly at module evaluation, so a slot
 * component importing its layout back (to call `useSlotContext(Layout, …)`)
 * creates an import cycle that breaks bundler HMR. A standalone context is a
 * leaf module both sides can import.
 *
 * @example
 * ```tsx
 * // panelContext.ts — leaf module
 * export const PanelContext = createSlotContext({ open: false });
 *
 * // Panel.tsx
 * const Panel = createComponentWithSlots(
 *   { Body: { component: PanelBody } },
 *   { context: PanelContext },
 * ).render(({ slots, provideContext }) => { … });
 *
 * // PanelBody.tsx — imports the context, not the layout
 * const open = useSlotContext(PanelContext, s => s.open);
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
