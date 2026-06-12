import { ReactElement } from "react";
import type { PrefixedConfig, RenderedSlots, SlotConfig } from "./types";
import { prefixSlots } from "./prefixSlots";

/**
 * Defines a reusable slot schema fragment with an associated render helper.
 * The returned object is spread into one or more parent slot configs via .config(),
 * and rendered inside the parent's render function via .render(slots).
 *
 * @example
 * ```tsx
 * const headerGroup = defineSlotGroup(
 *   "Header",
 *   { Title: {}, Actions: { multiple: true } },
 *   ({ slots }) => (
 *     <header>
 *       {slots["Header.Title"]}
 *       <div>{slots["Header.Actions"]}</div>
 *     </header>
 *   ),
 * );
 *
 * const Page = createComponentWithSlots({
 *   ...headerGroup.config(),
 *   Body: { isRequired: true },
 * }).render(({ slots }) => (
 *   <div>
 *     {headerGroup.render(slots)}
 *     {slots.Body}
 *   </div>
 * ));
 * ```
 */
export function defineSlotGroup<
  Prefix extends string,
  S extends Record<string, SlotConfig>,
>(
  prefix: Prefix,
  config: S,
  renderFn: (args: { slots: RenderedSlots<PrefixedConfig<Prefix, S>> }) => ReactElement,
): {
  config: () => PrefixedConfig<Prefix, S>;
  render: (slots: RenderedSlots<PrefixedConfig<Prefix, S>>) => ReactElement;
} {
  const prefixed = prefixSlots(prefix, config);
  return {
    config: () => prefixed,
    render: (slots) => renderFn({ slots }),
  };
}
