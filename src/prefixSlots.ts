import { assertSafeSlotPath } from "./slotPath";
import type { PrefixedConfig, SlotConfig } from "./types";

/**
 * Returns a new slot config record with all keys prefixed by `prefix + "."`.
 * Used as the low-level primitive for defineSlotGroup.
 *
 * @example
 * ```ts
 * prefixSlots("Header", { Title: {}, Actions: { multiple: true } })
 * // → { "Header.Title": {}, "Header.Actions": { multiple: true } }
 * ```
 */
export function prefixSlots<
  Prefix extends string,
  S extends Record<string, SlotConfig>,
>(prefix: Prefix, config: S): PrefixedConfig<Prefix, S> {
  const result = Object.create(null) as Record<string, SlotConfig>;
  for (const key of Object.keys(config)) {
    const path = `${prefix}.${key}`;
    assertSafeSlotPath(path);
    result[path] = config[key];
  }
  return result as PrefixedConfig<Prefix, S>;
}
