import { Slot, SlotBrand, SlotConfig, SlotDef, ValidateSlotProps } from "./types";

type ComponentProps<C> = C extends Slot<infer T> ? T : never;
type SlotOptions = Omit<SlotConfig<any>, "component" | "props">;
type Branded = { readonly [SlotBrand]: true };

// No component — default wrapper, options only
export function slot(config?: { component?: never } & SlotOptions): SlotDef;

// With component — C is preserved exactly, P is validated against component props
export function slot<
  C extends Slot<any>,
  P extends ValidateSlotProps<ComponentProps<C>, P> = never
>(
  config: SlotOptions & { component: C; props?: P },
): SlotOptions & { component: C; props?: P } & Branded;

export function slot(config?: any): any {
  return config ?? {};
}
