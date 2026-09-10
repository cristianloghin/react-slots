import {
  SLOT_BRAND,
  type AnyComponent,
  type BareSlotOptions,
  type ComponentSlotOptions,
  type SlotDef,
  type SlotOptions,
} from "./types";

/**
 * Declares one slot in a layout config.
 *
 * @example
 * ```tsx
 * createLayout({
 *   Header: { Title: slot(), Actions: slot({ multiple: true }) },
 *   Left:   slot({ component: Sidebar, props: { side: "left" } }),
 *   Body:   slot({ required: true, fallback: <Spinner /> }),
 *   Toolbar: slot({ portal: true }),
 * }, …)
 * ```
 */
export function slot(): SlotDef<{}>;
export function slot<const O extends BareSlotOptions>(options: O): SlotDef<O>;
export function slot<
  C extends AnyComponent,
  const O extends ComponentSlotOptions<C>,
>(options: O & { component: C }): SlotDef<O>;
export function slot(options: SlotOptions = {}): SlotDef<any> {
  return { [SLOT_BRAND]: true, options };
}

export function isSlotDef(value: unknown): value is SlotDef {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[SLOT_BRAND] === true
  );
}
