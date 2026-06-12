export class SlotContextStore<T extends object> {
  private value: T;
  private subscribers: Set<() => void> = new Set();

  constructor(defaults: T) {
    this.value = defaults;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
    this.subscribers.forEach(fn => fn());
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}
