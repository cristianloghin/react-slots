import {
  Children,
  cloneElement,
  createContext,
  ForwardedRef,
  forwardRef,
  Fragment,
  isValidElement,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import { isSlotContext, SlotContext } from "./createSlotContext";
import {
  createGroupHandle,
  MultiSlotHandle,
  PortalSlotHandle,
  SingleSlotHandle,
} from "./handles";
import { refProp } from "./refProp";
import { isSlotDef } from "./slot";
import { SlotContextStore } from "./SlotContextStore";
import { SlotPortalStore } from "./SlotPortalStore";
import type {
  Layout,
  LayoutApi,
  LayoutApiWithContext,
  SlotDef,
  SlotTree,
} from "./types";

const SLOT_KEY = Symbol("rst.slotKey");

// Names that would collide with a group handle's own members or with object
// internals when the accessor tree is built.
const RESERVED_NAMES = new Set(["__proto__", "constructor", "prototype", "filled", "when"]);

// Monotonic id source for portal registrants. Each mounted portal fill claims
// one id for the lifetime of the mount, used as its store key.
let nextPortalId = 0;

// The own keys React places on forwardRef / memo objects. A fill wrapper is a
// forwardRef object itself, so copying these from a wrapped `component` would
// replace the wrapper's render function or turn it into another element kind.
const REACT_EXOTIC_KEYS = new Set<PropertyKey>(["$$typeof", "render", "type", "compare"]);

function ownStatics(source: object): Record<PropertyKey, unknown> {
  const statics: Record<PropertyKey, unknown> = {};
  for (const key of Reflect.ownKeys(source)) {
    if (REACT_EXOTIC_KEYS.has(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor?.enumerable) statics[key] = descriptor.value;
  }
  return statics;
}

function copyStatics(target: object, statics: Record<PropertyKey, unknown>): void {
  for (const key of Reflect.ownKeys(statics)) {
    Object.defineProperty(target, key, {
      value: statics[key],
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}

const devError = (message: string): void => {
  if (process.env.NODE_ENV !== "production") console.error(`[rst] ${message}`);
};

const devWarn = (message: string): void => {
  if (process.env.NODE_ENV !== "production") console.warn(`[rst] ${message}`);
};

interface Leaf {
  /** Dotted path, e.g. "Header.Title". Used only for messages and store keys. */
  path: string;
  def: SlotDef;
  wrapper: any;
  fills: Record<PropertyKey, unknown>;
  symbol: symbol;
}

/**
 * Walks children the way a layout collects them: direct children, looking
 * through Fragments so a function child that returns `<>…</>` contributes its
 * fills individually.
 */
function forEachChild(
  children: ReactNode,
  visit: (child: ReactNode, index: number) => void,
): void {
  let index = 0;
  const walk = (node: ReactNode): void => {
    Children.forEach(node, (child) => {
      if (isValidElement(child) && child.type === Fragment) {
        walk((child.props as { children?: ReactNode }).children);
        return;
      }
      visit(child, index++);
    });
  };
  walk(children);
}

/**
 * Creates a layout: a component that collects slot fills from its children and
 * hands them to `render` to arrange.
 *
 * @param config - Slot definitions from `slot()`, nested in plain objects for
 *   grouping. Each leaf becomes a fill component on the returned layout
 *   (`Page.Header.Title`), and a handle under `slots` in the render function.
 * @param options.context - A context from `createSlotContext`. The render
 *   function then receives `provide`, and fills anywhere beneath the layout can
 *   read the value with `useSlotContext`.
 * @param render - `(props, { slots, children, provide }) => node`. Annotate
 *   `props` to type the layout's own props; declare `ref?: Ref<E>` there to
 *   receive the call-site ref as `props.ref`.
 *
 * @example
 * ```tsx
 * const Card = createLayout(
 *   { Header: slot(), Body: slot({ required: true }) },
 *   ({ className }: { className?: string }, { slots }) => (
 *     <div className={className}>
 *       {slots.Header.when((h) => h && <header>{h}</header>)}
 *       {slots.Body}
 *     </div>
 *   ),
 * );
 *
 * <Card className="x">
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 * </Card>
 * ```
 */
export function createLayout<S extends SlotTree, T extends object = {}>(
  config: S,
  render: (props: T, api: LayoutApi<S>) => ReactNode,
): Layout<S, T>;

export function createLayout<
  S extends SlotTree,
  C extends object,
  T extends object = {},
>(
  config: S,
  options: { context: SlotContext<C> },
  render: (props: T, api: LayoutApiWithContext<S, C>) => ReactNode,
): Layout<S, T>;

export function createLayout(
  config: SlotTree,
  optionsOrRender: { context: SlotContext<any> } | ((props: any, api: any) => ReactNode),
  maybeRender?: (props: any, api: any) => ReactNode,
): any {
  const options = typeof optionsOrRender === "function" ? undefined : optionsOrRender;
  const renderFn = (typeof optionsOrRender === "function" ? optionsOrRender : maybeRender)!;

  // ── Config → leaves + accessor tree ──────────────────────────────────────

  const leaves: Leaf[] = [];
  const leafBySymbol = new Map<symbol, Leaf>();
  const leafByPath = new Map<string, Leaf>();

  const PortalContext = createContext<Record<string, SlotPortalStore> | null>(null);
  let hasPortals = false;

  function buildWrapper(path: string, def: SlotDef, symbol: symbol): Leaf {
    const { component: Base, props: bound = {}, portal } = def.options as {
      component?: any;
      props?: object;
      portal?: boolean;
    };
    const fills = Base ? ownStatics(Base) : {};

    // A fill's children may be a function of the fill itself (which carries the
    // nested fills as statics), so a fill can be written in another file without
    // importing the layout. It runs during the wrapper's render, so hooks are
    // allowed and the result is collected by the wrapped component synchronously.
    let wrapper: any;
    const resolveChildren = (children: unknown): ReactNode =>
      typeof children === "function" ? (children as Function)(wrapper) : (children as ReactNode);

    if (portal) {
      hasPortals = true;
      // A portal fill renders nothing where it sits; on mount it registers its
      // content into the store for this slot and removes it on unmount. Re-running
      // the effect every render keeps the registered node current.
      wrapper = forwardRef(function PortalFill(
        { children, asChild, ...userProps }: any,
        ref: ForwardedRef<unknown>,
      ) {
        const stores = useContext(PortalContext);
        const store = stores ? stores[path] : undefined;

        const idRef = useRef<string | null>(null);
        if (idRef.current === null) idRef.current = `rst-portal-${nextPortalId++}`;

        const content = resolveChildren(children);
        let node: ReactNode;
        if (asChild) {
          if (!isValidElement(content)) {
            devError(`Slot "${path}" with asChild must receive exactly one React element as its child.`);
            node = null;
          } else {
            node = content;
          }
        } else if (Base) {
          node = (
            <Base {...bound} {...userProps} {...refProp(ref)}>
              {content}
            </Base>
          );
        } else {
          node = content;
        }

        useLayoutEffect(() => {
          if (!store) {
            devError(`Portal slot "${path}" was rendered outside its layout; content was dropped.`);
            return;
          }
          const id = idRef.current as string;
          store.register(id, node);
          return () => store.unregister(id);
        });

        return null;
      });
    } else if (Base) {
      // Strip asChild before forwarding — it is consumed during collection and
      // must not leak through to the underlying component.
      wrapper = forwardRef(function SlotFill(
        { children, asChild: _, ...userProps }: any,
        ref: ForwardedRef<unknown>,
      ) {
        return (
          <Base {...bound} {...userProps} {...refProp(ref)}>
            {resolveChildren(children)}
          </Base>
        );
      });
    } else {
      wrapper = function SlotFill({ children }: { children?: unknown }) {
        return <>{resolveChildren(children)}</>;
      };
    }

    // Nested slot accessors (Page.Header.Title) come from the component's statics.
    copyStatics(wrapper, fills);
    wrapper[SLOT_KEY] = symbol;

    const leaf: Leaf = { path, def, wrapper, fills, symbol };
    leaves.push(leaf);
    leafBySymbol.set(symbol, leaf);
    leafByPath.set(path, leaf);
    return leaf;
  }

  function buildTree(tree: SlotTree, prefix: string[]): Record<string, unknown> {
    const node = Object.create(null) as Record<string, unknown>;
    for (const name of Object.keys(tree)) {
      if (RESERVED_NAMES.has(name)) {
        throw new TypeError(`[rst] "${name}" cannot be used as a slot name.`);
      }
      const entry = tree[name];
      const path = [...prefix, name].join(".");
      if (isSlotDef(entry)) {
        node[name] = buildWrapper(path, entry, Symbol(path)).wrapper;
      } else if (entry && typeof entry === "object") {
        node[name] = buildTree(entry as SlotTree, [...prefix, name]);
      } else {
        throw new TypeError(`[rst] Slot "${path}" must be a slot() or a group object.`);
      }
    }
    return node;
  }

  const accessors = buildTree(config, []);

  // ── Context ──────────────────────────────────────────────────────────────

  const sharedContext = options?.context;
  if (sharedContext !== undefined && !isSlotContext(sharedContext)) {
    throw new TypeError("[rst] options.context must be created with createSlotContext().");
  }

  // ── Component ────────────────────────────────────────────────────────────

  const Component = forwardRef(function SlotLayout(
    { children, ...props }: { children?: ReactNode },
    ref: ForwardedRef<unknown>,
  ) {
    // Per-instance context store, so two mounted instances never share state.
    const storeRef = useRef<SlotContextStore<any> | null>(null);
    if (storeRef.current === null && sharedContext) {
      storeRef.current = new SlotContextStore(sharedContext.__defaults);
    }

    // Per-instance portal stores, one per portal slot.
    const portalStoresRef = useRef<Record<string, SlotPortalStore> | null>(null);
    if (portalStoresRef.current === null && hasPortals) {
      const stores = Object.create(null) as Record<string, SlotPortalStore>;
      for (const leaf of leaves) {
        if (leaf.def.options.portal) stores[leaf.path] = new SlotPortalStore();
      }
      portalStoresRef.current = stores;
    }

    // `provide` captures the value during render; the layout effect pushes it
    // to the store after commit so subscribers are never notified mid-render.
    const pendingContextRef = useRef<unknown>(undefined);
    const provide = useCallback((value: unknown) => {
      pendingContextRef.current = value;
    }, []);
    useLayoutEffect(() => {
      if (storeRef.current !== null && pendingContextRef.current !== undefined) {
        storeRef.current.set(pendingContextRef.current);
        pendingContextRef.current = undefined;
      }
    });

    // ── Collection ──────────────────────────────────────────────────────

    const collected = new Map<Leaf, ReactElement[]>();
    const rest: ReactNode[] = [];
    // Portal fills given at the layout's own call site: mounted invisibly inside
    // the portal provider so their registration effects run.
    const registrars: ReactElement[] = [];

    forEachChild(children, (child, index) => {
      if (!isValidElement(child)) {
        if (child != null && typeof child !== "boolean") rest.push(child);
        return;
      }
      const leaf = leafBySymbol.get((child.type as any)?.[SLOT_KEY]);
      if (!leaf) {
        rest.push(child);
        return;
      }

      if (leaf.def.options.portal) {
        registrars.push(child.key != null ? child : cloneElement(child, { key: index }));
        return;
      }

      let element: ReactElement = child;
      const childProps = child.props as { asChild?: boolean; children?: unknown };
      if (childProps.asChild) {
        if (typeof childProps.children === "function") {
          devError(`Slot "${leaf.path}" cannot combine asChild with a function child.`);
          return;
        }
        if (!isValidElement(childProps.children)) {
          devError(`Slot "${leaf.path}" with asChild must receive exactly one React element as its child.`);
          return;
        }
        element = childProps.children;
      }

      const list = collected.get(leaf) ?? [];
      if (leaf.def.options.multiple) {
        list.push(element.key != null ? element : cloneElement(element, { key: index }));
      } else {
        if (list.length > 0) {
          devWarn(`Slot "${leaf.path}" received more than one fill but is not \`multiple\`; only the last one is used.`);
        }
        list[0] = element;
      }
      collected.set(leaf, list);
    });

    // Required slots. Portal content arrives after commit, so it is exempt.
    const missing = leaves
      .filter((leaf) => leaf.def.options.required && !leaf.def.options.portal)
      .filter((leaf) => (collected.get(leaf)?.length ?? 0) === 0)
      .map((leaf) => leaf.path);
    if (missing.length > 0) devError(`Required slots missing: ${missing.join(", ")}`);

    // ── Handles ─────────────────────────────────────────────────────────

    const buildHandles = (tree: SlotTree, prefix: string[]): any => {
      const children: Record<string, any> = {};
      for (const name of Object.keys(tree)) {
        const entry = tree[name];
        const path = [...prefix, name].join(".");
        if (isSlotDef(entry)) {
          const leaf = leafByPath.get(path)!;
          const { multiple, fallback, portal } = leaf.def.options;
          if (portal) {
            children[name] = new PortalSlotHandle(portalStoresRef.current![path], !!multiple);
          } else if (multiple) {
            children[name] = new MultiSlotHandle(collected.get(leaf) ?? [], fallback);
          } else {
            children[name] = new SingleSlotHandle(collected.get(leaf)?.[0] ?? null, fallback);
          }
        } else {
          children[name] = buildHandles(entry as SlotTree, [...prefix, name]);
        }
      }
      return createGroupHandle(children);
    };
    const slots = buildHandles(config, []);

    // ── Render ──────────────────────────────────────────────────────────

    const api = sharedContext
      ? { slots, children: rest, provide }
      : { slots, children: rest };
    let output: ReactNode = renderFn({ ...props, ref }, api);

    if (portalStoresRef.current !== null) {
      // Registrars first: their effects run before the body's, so a portal fill
      // at the call site acts as a default that deeper content overrides.
      output = (
        <PortalContext.Provider value={portalStoresRef.current}>
          {registrars}
          {output}
        </PortalContext.Provider>
      );
    }

    if (sharedContext && storeRef.current !== null) {
      const StoreContext = sharedContext.__storeContext;
      output = <StoreContext.Provider value={storeRef.current}>{output}</StoreContext.Provider>;
    }

    return <>{output}</>;
  });

  copyStatics(Component, accessors);
  return Component;
}
