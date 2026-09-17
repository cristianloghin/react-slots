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

/**
 * Every key a handle emits is built here, from two parts.
 *
 * The slot's id makes the key unique to one slot. A handle's output does not
 * only get iterated: `render` and `when` hand it straight back to the layout
 * author, who places it among siblings the layout owns. A key that said only
 * "fill" would therefore be the same key on every slot, and two slots placed
 * side by side would claim one identity. React resolves that by losing track of
 * one of them and leaving its DOM in the document, which stays invisible until
 * the surrounding markup changes shape.
 *
 * The role makes fill and fallback distinct within one slot, so a slot swapping
 * between them rebuilds instead of reusing whatever was there.
 *
 * Keys are composed nowhere else. If a node needs one, it comes from here.
 */
const slotKey = (slotId: string, role: string): string => `${slotId}:${role}`;

// Handles are iterables, and React applies list-key rules to what an iterable
// yields; a keyed wrapper satisfies them without cloning the collected
// elements, and passing an element as the Fragment's single child marks it
// validated.
function keyed(slotId: string, role: string, node: ReactNode): ReactElement {
  return createElement(Fragment, { key: slotKey(slotId, role) }, node);
}

/** The callbacks `when` takes: one for content, an optional one for its absence. */
type WhenRender = (content: ReactNode) => ReactNode;
type WhenOtherwise = (() => ReactNode) | undefined;

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
  otherwise,
}: {
  store: SlotPortalStore;
  multiple?: boolean;
  render?: WhenRender;
  otherwise?: WhenOtherwise;
}): ReactElement {
  const nodes = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  if (nodes.length === 0) {
    return <>{render ? (otherwise ? otherwise() : null) : null}</>;
  }
  const content: ReactNode = multiple
    ? nodes.map((node, i) => <Fragment key={i}>{node}</Fragment>)
    : nodes[nodes.length - 1];
  return <>{render ? render(content) : content}</>;
}

export class SingleSlotHandle<P> implements SingleHandle<P> {
  constructor(
    readonly element: ReactElement<P> | null,
    private readonly fallback: ReactNode,
    private readonly id: string,
  ) {}

  get filled(): boolean {
    return this.element !== null;
  }

  get props(): P | undefined {
    return this.element?.props;
  }

  private content(extra?: Partial<P>): ReactNode {
    if (this.element) {
      const element = extra ? cloneElement(this.element, extra) : this.element;
      return keyed(this.id, "fill", element);
    }
    return this.fallback == null
      ? null
      : keyed(this.id, "fallback", this.fallback);
  }

  render(extra: Partial<P>): ReactNode {
    return this.content(extra);
  }

  when(render: WhenRender, otherwise?: WhenOtherwise): ReactNode {
    if (this.element) return render(this.content());
    return otherwise ? otherwise() : null;
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
    private readonly id: string,
  ) {}

  get filled(): boolean {
    return this.elements.length > 0;
  }

  get props(): P[] {
    return this.elements.map((element) => element.props);
  }

  private content(extra?: Partial<P>): ReactNode {
    if (this.elements.length > 0) {
      const elements = extra
        ? this.elements.map((element) => cloneElement(element, extra))
        : this.elements;
      return keyed(this.id, "fill", elements);
    }
    return this.fallback == null
      ? null
      : keyed(this.id, "fallback", this.fallback);
  }

  render(extra: Partial<P>): ReactNode {
    return this.content(extra);
  }

  when(render: WhenRender, otherwise?: WhenOtherwise): ReactNode {
    if (this.elements.length > 0) return render(this.content());
    return otherwise ? otherwise() : null;
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
    private readonly id: string,
  ) {}

  when(render: WhenRender, otherwise?: WhenOtherwise): ReactNode {
    return (
      <PortalConsumer
        key={slotKey(this.id, "portal")}
        store={this.store}
        multiple={this.multiple}
        render={render}
        otherwise={otherwise}
      />
    );
  }

  *[Symbol.iterator](): Iterator<ReactNode> {
    yield (
      <PortalConsumer
        key={slotKey(this.id, "portal")}
        store={this.store}
        multiple={this.multiple}
      />
    );
  }
}

type AnyHandle =
  | SingleSlotHandle<any>
  | MultiSlotHandle<any>
  | PortalSlotHandle
  | GroupHandle<any>;

const GROUP_ID = Symbol("rst.groupId");

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
  value(
    this: Record<string, AnyHandle> & Iterable<ReactNode>,
    render: WhenRender,
    otherwise?: WhenOtherwise,
  ): ReactNode {
    const filled = (this as unknown as { filled: boolean }).filled;
    const id = (this as unknown as Record<symbol, unknown>)[GROUP_ID] as string;
    if (filled) return render(keyed(id, "group", Array.from(this)));
    return otherwise ? otherwise() : null;
  },
});

Object.defineProperty(groupProto, Symbol.iterator, {
  value: function* (this: Record<string, AnyHandle>): Iterator<ReactNode> {
    const id = (this as unknown as Record<symbol, unknown>)[GROUP_ID] as string;
    for (const key of Object.keys(this)) {
      for (const node of this[key]) yield keyed(id, key, node);
    }
  },
});

/** Builds a group handle whose own enumerable keys are its child handles, in config order. */
export function createGroupHandle(
  children: Record<string, AnyHandle>,
  id: string,
): GroupHandle<any> {
  const group = Object.create(groupProto) as Record<string, AnyHandle>;
  // Non-enumerable and symbol-keyed, so `filled` and the iterator keep seeing
  // only the group's members when they walk it with Object.keys.
  Object.defineProperty(group, GROUP_ID, { value: id });
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
