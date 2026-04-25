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
export function prefixSlots<Prefix extends string, S extends Record<string, SlotConfig>>(
  prefix: Prefix,
  config: S,
): PrefixedConfig<Prefix, S> {
  const result: Record<string, SlotConfig> = {};
  for (const key of Object.keys(config)) {
    result[`${prefix}.${key}`] = config[key];
  }
  return result as PrefixedConfig<Prefix, S>;
}
