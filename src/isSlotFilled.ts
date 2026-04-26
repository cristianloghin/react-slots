import { ReactNode } from "react";

function isFilled(slot: ReactNode | ReactNode[] | undefined): boolean {
  if (Array.isArray(slot)) return slot.length > 0;
  return slot !== null && slot !== undefined;
}

/**
 * Checks whether a slot or group of slots has content.
 *
 * - Exact key:      `isSlotFilled(slots, 'Header.Title')`
 * - Key array some: `isSlotFilled(slots, ['Header.Title', 'Header.Action'])` — at least one filled
 * - Key array all:  `isSlotFilled(slots, ['Header.Title', 'Header.Action'], true)` — all filled
 * - Wildcard some:  `isSlotFilled(slots, 'Header*')` — at least one match is filled
 * - Wildcard all:   `isSlotFilled(slots, 'Header*', true)` — every match is filled
 */
export function isSlotFilled(
  slots: Record<string, ReactNode | ReactNode[]>,
  pattern: string | string[],
  all = false,
): boolean {
  if (Array.isArray(pattern)) {
    if (pattern.length === 0) return false;
    return all
      ? pattern.every((k) => isFilled(slots[k]))
      : pattern.some((k) => isFilled(slots[k]));
  }
  if (pattern.includes("*")) {
    const prefix = pattern.slice(0, pattern.indexOf("*"));
    const keys = Object.keys(slots).filter((k) => k.startsWith(prefix));
    if (keys.length === 0) return false;
    return all ? keys.every((k) => isFilled(slots[k])) : keys.some((k) => isFilled(slots[k]));
  }
  return isFilled(slots[pattern]);
}
