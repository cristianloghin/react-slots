import {
  cloneElement,
  createElement,
  Fragment,
  ReactElement,
  ReactNode,
  useSyncExternalStore,
} from "react";
import type { SlotPortalStore } from "./SlotPortalStore";
import type {
  GroupHandle,
  MultiHandle,
  PortalHandle,
  SingleHandle,
} from "./types";

// Every node a handle emits is wrapped in a keyed Fragment. Handles are
// iterables, and React applies list-key rules to what an iterable yields; a
// keyed wrapper satisfies them without cloning the collected elements, and
// passing an element as the Fragment's single child marks it validated.
function keyed(key: string, node: ReactNode): ReactElement {
  return createElement(Fragment, { key }, node);
}

/**
 * The single subscribing leaf for a portal slot — used both at the slot's
 * position and by `when()`. It resolves the registered nodes to one value:
 * `null` when empty, every node for a `multiple` slot, otherwise the last
 * registrant (which therefore wins). Only this leaf re-renders on fill/unfill.
 */
export function PortalConsumer({
  store,
  multiple,
  render,
}: {
  store: SlotPortalStore;
  multiple?: boolean;
  render?: (content: ReactNode) => ReactNode;
}): ReactElement {
  const nodes = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const content: ReactNode =
    nodes.length === 0
      ? null
      : multiple
        ? nodes.map((node, i) => <Fragment key={i}>{node}</Fragment>)
        : nodes[nodes.length - 1];
  return <>{render ? render(content) : content}</>;
}

export class SingleSlotHandle<P> implements SingleHandle<P> {
  constructor(
    readonly element: ReactElement<P> | null,
    private readonly fallback: ReactNode,
  ) {}

  get filled(): boolean {
    return this.element !== null;
  }

  get props(): P | undefined {
    return this.element?.props;
  }

  private content(): ReactNode {
    if (this.element) return keyed("fill", this.element);
    return this.fallback == null ? null : keyed("fallback", this.fallback);
  }

  render(extra: Partial<P>): ReactNode {
    if (!this.element) return this.content();
    return keyed("fill", cloneElement(this.element, extra));
  }

  when(render: (content: ReactNode) => ReactNode): ReactNode {
    return render(this.element ? this.content() : null);
  }

  *[Symbol.iterator](): Iterator<ReactNode> {
    const node = this.content();
    if (node !== null) yield node;
  }
}

export class MultiSlotHandle<P> implements MultiHandle<P> {
  constructor(
    readonly elements: ReactElement<P>[],
    private readonly fallback: ReactNode,
  ) {}

  get filled(): boolean {
    return this.elements.length > 0;
  }

  get props(): P[] {
    return this.elements.map((element) => element.props);
  }

  private content(): ReactNode {
    if (this.elements.length > 0) return keyed("fill", this.elements);
    return this.fallback == null ? null : keyed("fallback", this.fallback);
  }

  render(extra: Partial<P>): ReactNode {
    if (this.elements.length === 0) return this.content();
    return keyed(
      "fill",
      this.elements.map((element) => cloneElement(element, extra)),
    );
  }

  when(render: (content: ReactNode) => ReactNode): ReactNode {
    return render(this.elements.length > 0 ? this.content() : null);
  }

  *[Symbol.iterator](): Iterator<ReactNode> {
    const node = this.content();
    if (node !== null) yield node;
  }
}

export class PortalSlotHandle implements PortalHandle {
  constructor(
    private readonly store: SlotPortalStore,
    private readonly multiple: boolean,
  ) {}

  when(render: (content: ReactNode) => ReactNode): ReactNode {
    return (
      <PortalConsumer
        key="portal"
        store={this.store}
        multiple={this.multiple}
        render={render}
      />
    );
  }

  *[Symbol.iterator](): Iterator<ReactNode> {
    yield <PortalConsumer key="portal" store={this.store} multiple={this.multiple} />;
  }
}

type AnyHandle =
  | SingleSlotHandle<any>
  | MultiSlotHandle<any>
  | PortalSlotHandle
  | GroupHandle<any>;

const groupProto = {} as Record<string | symbol, unknown>;

Object.defineProperty(groupProto, "filled", {
  get(this: Record<string, AnyHandle>): boolean {
    return Object.keys(this).some((key) => {
      const child = this[key];
      // Portal presence is not knowable during render; it never counts.
      return !(child instanceof PortalSlotHandle) && child.filled;
    });
  },
});

Object.defineProperty(groupProto, "when", {
  value(this: Record<string, AnyHandle> & Iterable<ReactNode>, render: (content: ReactNode) => ReactNode): ReactNode {
    const filled = (this as unknown as { filled: boolean }).filled;
    return render(filled ? keyed("group", Array.from(this)) : null);
  },
});

Object.defineProperty(groupProto, Symbol.iterator, {
  value: function* (this: Record<string, AnyHandle>): Iterator<ReactNode> {
    for (const key of Object.keys(this)) {
      for (const node of this[key]) yield keyed(key, node);
    }
  },
});

/** Builds a group handle whose own enumerable keys are its child handles, in config order. */
export function createGroupHandle(
  children: Record<string, AnyHandle>,
): GroupHandle<any> {
  const group = Object.create(groupProto) as Record<string, AnyHandle>;
  for (const key of Object.keys(children)) {
    Object.defineProperty(group, key, {
      value: children[key],
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return group as unknown as GroupHandle<any>;
}
