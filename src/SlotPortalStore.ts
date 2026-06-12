import type { ReactNode } from "react";

/**
 * Backing store for a single portal slot.
 *
 * Unlike {@link SlotContextStore} — which flows a single value parent → child —
 * a portal slot flows content child → ancestor: any number of `<Layout.X>`
 * elements mounted anywhere beneath the layout register their content here, and
 * the layout renders it at the slot's position via `useSyncExternalStore`.
 *
 * Entries are keyed by a per-registrant id and kept in insertion order, so for a
 * single-value slot the most recently mounted registrant wins (e.g. a route
 * rendered through an `<Outlet />` overrides a default provided at the layout's
 * own call site). The snapshot array is rebuilt only on mutation so its identity
 * stays stable between reads — a requirement of `useSyncExternalStore`.
 */
export class SlotPortalStore {
  private entries = new Map<string, ReactNode>();
  private snapshot: ReactNode[] = [];
  private subscribers = new Set<() => void>();

  register = (id: string, node: ReactNode): void => {
    this.entries.set(id, node);
    this.refresh();
  };

  unregister = (id: string): void => {
    if (this.entries.delete(id)) this.refresh();
  };

  getSnapshot = (): ReactNode[] => this.snapshot;

  subscribe = (fn: () => void): (() => void) => {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  };

  private refresh(): void {
    this.snapshot = Array.from(this.entries.values());
    this.subscribers.forEach((fn) => fn());
  }
}
