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
  useSyncExternalStore,
} from "react";
import { isSlotContext, SlotContext } from "./createSlotContext";
import { SlotContextStore } from "./SlotContextStore";
import { SlotPortalStore } from "./SlotPortalStore";
import { assertSafeSlotPath } from "./slotPath";
import {
  ComponentBuilder,
  ComponentBuilderWithContext,
  RenderedSlots,
  Slot,
  SlotConfig,
} from "./types";

const SLOT_KEY = Symbol("rst-slot");

// Monotonic id source for portal registrants. Each mounted `<Layout.X>` portal
// element claims one id for the lifetime of the mount, used as its store key.
let nextPortalId = 0;

// The own keys React places on forwardRef / memo objects. A slot wrapper is a
// forwardRef object itself, so copying these from a wrapped `component` would
// replace the wrapper's render function or turn it into another element kind.
const REACT_EXOTIC_KEYS = new Set<PropertyKey>([
  "$$typeof",
  "render",
  "type",
  "compare",
]);

function copyEnumerableStatics(target: object, source: object): void {
  for (const key of Reflect.ownKeys(source)) {
    if (REACT_EXOTIC_KEYS.has(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor?.enumerable) Object.defineProperty(target, key, descriptor);
  }
}

// Spread-friendly ref: adds `ref` only when the caller gave one, so a plain
// function `component` never sees a stray `ref: null` prop on React 19 and
// React 18 never warns about a ref on a component that cannot take one.
function refProp<E>(
  ref: ForwardedRef<E>,
): { ref: ForwardedRef<E> } | undefined {
  return ref === null ? undefined : { ref };
}

function defineSlotAccessor(
  target: object,
  path: string,
  slot: Slot<any>,
): void {
  const parts = path.split(".");
  let node = target as Record<string, unknown>;

  for (const part of parts.slice(0, -1)) {
    if (!Object.prototype.hasOwnProperty.call(node, part)) {
      Object.defineProperty(node, part, {
        value: Object.create(null),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    const next = node[part];
    if (
      next === null ||
      (typeof next !== "object" && typeof next !== "function")
    ) {
      throw new TypeError(
        `[rst] Invalid slot path "${path}": segment "${part}" cannot contain nested slots.`,
      );
    }
    node = next as Record<string, unknown>;
  }

  Object.defineProperty(node, parts[parts.length - 1], {
    value: slot,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

/**
 * The single subscribing leaf for a portal slot — used both at the slot's
 * position (`slots.X`) and by the presence-aware `portal()` helper. It subscribes
 * to the per-instance store and resolves the registered nodes to one renderable
 * value: `null` when empty, every node for a `multiple` slot, otherwise the last
 * registrant (which therefore wins). When `render` is given it receives that
 * value — pass `null`/content through to gate surrounding chrome on presence.
 *
 * Because the subscription lives here and not in the layout body, only this node
 * re-renders on fill/unfill; heavy sibling content in the layout stays stable.
 */
function PortalConsumer({
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

/**
 * Creates a component builder with a slot-based composition pattern.
 *
 * @param slotsConfig - Slot name → config map
 * @param options.context - Optional context shape with default values, or a
 *   standalone context created by `createSlotContext`. When provided, the render
 *   function receives `provideContext` and the returned component can be passed
 *   to `useSlotContext` to read context values from within slot components.
 *   Prefer the `createSlotContext` form when slot components live in their own
 *   modules: they consume the context object instead of importing the layout,
 *   which would be an import cycle (the slot config reads component bindings
 *   eagerly at module evaluation).
 * @returns A builder with a `render<T>()` method
 *
 * @example
 * ```tsx
 * // Without context
 * const Card = createComponentWithSlots({ Header: {}, Body: {} })
 *   .render<{ className: string }>(({ slots, className }) => (
 *     <div className={className}>{slots.Header}{slots.Body}</div>
 *   ));
 *
 * // With context — slot components can call useSlotContext(Panel, s => s.open)
 * const Panel = createComponentWithSlots(
 *   { Body: {} },
 *   { context: { open: false, toggle: () => {} } },
 * ).render(({ slots, provideContext }) => {
 *   const [open, setOpen] = useState(false);
 *   provideContext({ open, toggle: () => setOpen(o => !o) });
 *   return <div>{open && slots.Body}</div>;
 * });
 * ```
 */
export function createComponentWithSlots<S extends Record<string, SlotConfig>>(
  slotsConfig: S,
): ComponentBuilder<S>;

export function createComponentWithSlots<
  S extends Record<string, SlotConfig>,
  C extends object,
>(
  slotsConfig: S,
  options: { context: SlotContext<C> },
): ComponentBuilderWithContext<S, C>;

export function createComponentWithSlots<
  S extends Record<string, SlotConfig>,
  C extends object,
>(slotsConfig: S, options: { context: C }): ComponentBuilderWithContext<S, C>;

export function createComponentWithSlots<
  S extends Record<string, SlotConfig>,
  C extends object,
>(
  slotsConfig: S,
  options?: { context: C | SlotContext<C> },
): ComponentBuilder<S> | ComponentBuilderWithContext<S, C> {
  type SlotName = keyof S;

  (Object.keys(slotsConfig) as Array<SlotName>).forEach((key) => {
    assertSafeSlotPath(String(key));
  });

  const hasPortals = (Object.keys(slotsConfig) as Array<SlotName>).some(
    (key) => slotsConfig[key].portal,
  );

  // Carries the per-instance portal stores (one per portal slot) down to portal
  // registrants, which may live arbitrarily deep — e.g. inside an <Outlet />.
  // Keyed by the full slot name (including dot-paths).
  const PortalContext = hasPortals
    ? createContext<Record<string, SlotPortalStore> | null>(null)
    : null;

  // Each slot gets a unique per-instance Symbol so two slots sharing the same
  // component type can still be distinguished during child collection.
  const slotComponents = Object.create(null) as Record<SlotName, Slot<any>>;
  (Object.keys(slotsConfig) as Array<SlotName>).forEach((slotKey) => {
    const config = slotsConfig[slotKey];
    const slotSymbol = Symbol(String(slotKey));

    if (config.portal && PortalContext) {
      // A portal slot wrapper renders nothing at its own location; on mount it
      // registers its content into the store for this slot, and removes it on
      // unmount. The layout shows the content via <PortalOutlet> at the slot's
      // position. Re-running the effect every render keeps the registered node
      // in sync when the registrant re-renders with new content.
      const Base = config.component as any;
      const PortalSlot = forwardRef(function PortalSlot(
        { children, asChild, ...userProps }: any,
        ref,
      ) {
        const stores = useContext(PortalContext);
        const store = stores ? stores[String(slotKey)] : undefined;

        const idRef = useRef<string | null>(null);
        if (idRef.current === null)
          idRef.current = `rst-portal-${nextPortalId++}`;

        let node: ReactNode;
        if (asChild) {
          if (!isValidElement(children)) {
            if (process.env.NODE_ENV !== "production") {
              console.error(
                `[rst] Portal slot "${String(slotKey)}" with asChild={true} must receive exactly one React element as its child.`,
              );
            }
            node = null;
          } else {
            node = children;
          }
        } else if (Base) {
          // The ref lands on the teleported node, wherever the layout renders it.
          node = (
            <Base {...userProps} {...refProp(ref)}>
              {children}
            </Base>
          );
        } else {
          node = children;
        }

        useLayoutEffect(() => {
          if (!store) {
            if (process.env.NODE_ENV !== "production") {
              console.error(
                `[rst] Portal slot "${String(slotKey)}" was rendered outside its layout; content was dropped.`,
              );
            }
            return;
          }
          const id = idRef.current as string;
          store.register(id, node);
          return () => store.unregister(id);
        });

        return null;
      }) as unknown as Slot<any>;

      if (Base) copyEnumerableStatics(PortalSlot, Base);
      (PortalSlot as any)[SLOT_KEY] = slotSymbol;
      slotComponents[slotKey] = PortalSlot;
      return;
    }

    let wrapper: Slot<any>;
    if (config.component) {
      const Base = config.component as any;
      // Strip asChild before forwarding — it is consumed during child collection
      // and must not leak through to the underlying component. The ref is
      // forwarded, so `<Layout.X ref>` reaches a component that accepts one.
      wrapper = forwardRef(function SlotWrapper(
        { children, asChild: _, ...userProps }: any,
        ref,
      ) {
        return (
          <Base {...userProps} {...refProp(ref)}>
            {children}
          </Base>
        );
      }) as unknown as Slot<any>;
      // Copy static properties (e.g. nested slot components) so that
      // Parent.SlottedChild.NestedSlot resolves correctly at runtime.
      copyEnumerableStatics(wrapper, Base);
    } else {
      wrapper = ({
        children,
        asChild: _,
      }: {
        children?: ReactNode;
        asChild?: boolean;
      }) => <>{children}</>;
    }

    (wrapper as any)[SLOT_KEY] = slotSymbol;
    slotComponents[slotKey] = wrapper;
  });

  // The context option is either a plain defaults object or a standalone
  // context from createSlotContext (detected by its brand). Either way, each
  // mounted instance provides its own store via the Provider; the context's
  // default value (used when no Provider is in the tree) is a store initialised
  // with the declared defaults, so useSlotContext never returns undefined.
  const contextOption = options?.context;
  const sharedContext =
    contextOption !== undefined && isSlotContext(contextOption)
      ? (contextOption as SlotContext<C>)
      : null;
  const contextDefaults =
    sharedContext !== null
      ? sharedContext.__defaults
      : (contextOption as C | undefined);
  const StoreContext =
    sharedContext !== null
      ? sharedContext.__storeContext
      : contextDefaults !== undefined
        ? createContext<SlotContextStore<C>>(
            new SlotContextStore<C>(contextDefaults),
          )
        : null;

  // `satisfies` contextually types `render` from the context-bearing interface
  // (the wider of the two), so the arrow adopts its <T, E> signature. Declaring
  // the generics here instead makes TS unify two generic signatures, and it
  // cannot infer T through the RenderProps intersection.
  const builder = {
    render: (renderFn) => {
      // forwardRef so the call-site ref reaches the render function on React 18
      // too; a plain function component only receives `ref` as a prop on 19.
      const Component = forwardRef(function SlotLayout(
        { children, ...props }: any,
        ref: ForwardedRef<unknown>,
      ) {
        // Per-instance store — lazily initialised on first render so each mounted
        // instance of this component has its own isolated context.
        const storeRef = useRef<SlotContextStore<C> | null>(null);
        if (storeRef.current === null && contextDefaults !== undefined) {
          storeRef.current = new SlotContextStore<C>(contextDefaults);
        }

        // Per-instance portal stores, one per portal slot. Lazily created so each
        // mounted layout teleports content into its own slots, not a shared global.
        const portalStoresRef = useRef<Record<string, SlotPortalStore> | null>(
          null,
        );
        if (portalStoresRef.current === null && hasPortals) {
          const stores = Object.create(null) as Record<string, SlotPortalStore>;
          (Object.keys(slotsConfig) as Array<SlotName>).forEach((key) => {
            if (slotsConfig[key].portal)
              stores[String(key)] = new SlotPortalStore();
          });
          portalStoresRef.current = stores;
        }

        // provideContext captures the value during render; the layout effect
        // pushes it to the store after the commit so store.set is never called
        // during a React render pass.
        const pendingContextRef = useRef<C | null>(null);
        const provideContext = useCallback((value: C) => {
          pendingContextRef.current = value;
        }, []);

        // Presence-aware boundary for a portal slot. Reads the stable store from
        // the ref and returns the same leaf used at the slot position, so the
        // layout body (and any heavy content in it) is never re-rendered on
        // fill/unfill. `render` receives the resolved content (null when empty),
        // so a single subscription serves both presence and content.
        const portal = useCallback(
          (name: string, render: (content: ReactNode) => ReactNode) => {
            const store = portalStoresRef.current?.[name];
            if (!store) {
              if (process.env.NODE_ENV !== "production") {
                console.error(
                  `[rst] portal("${name}", …) was called for a slot that is not configured with { portal: true }.`,
                );
              }
              return null;
            }
            return (
              <PortalConsumer
                store={store}
                multiple={slotsConfig[name as SlotName]?.multiple}
                render={render}
              />
            );
          },
          [],
        );

        useLayoutEffect(() => {
          if (storeRef.current !== null && pendingContextRef.current !== null) {
            storeRef.current.set(pendingContextRef.current);
            pendingContextRef.current = null;
          }
        });

        const slotElements = Object.create(null) as {
          [K in SlotName]: ReactElement[] | ReactElement | null;
        };
        const nonSlotChildren: ReactElement[] = [];
        // Portal-slot elements provided at the layout's own call site. They are
        // mounted (invisibly) inside the portal provider so their registration
        // effects run, just like portal elements rendered deeper in the tree.
        const portalRegistrars: ReactElement[] = [];

        (Object.keys(slotsConfig) as Array<SlotName>).forEach((slotKey) => {
          const config = slotsConfig[slotKey];
          if (config.multiple) {
            slotElements[slotKey] = [];
          } else {
            slotElements[slotKey] = config.defaultContent ? (
              <>{config.defaultContent}</>
            ) : null;
          }
        });

        Children.forEach(children, (child, index) => {
          if (isValidElement(child)) {
            // Match by per-slot Symbol so two slots sharing the same component
            // can still be distinguished.
            const childSlotKey = (child.type as any)[SLOT_KEY];
            const slotEntry = (
              Object.entries(slotComponents) as Array<[SlotName, any]>
            ).find(
              ([_, slotComponent]) => slotComponent[SLOT_KEY] === childSlotKey,
            );

            if (slotEntry) {
              const [slotName] = slotEntry;
              const config = slotsConfig[slotName];

              // Portal slot: don't collect into slotElements. Render the element
              // as-is so its wrapper's registration effect runs (it returns null).
              if (config.portal) {
                portalRegistrars.push(
                  child.key != null
                    ? child
                    : cloneElement(child, { key: index }),
                );
                return;
              }

              // asChild: dissolve the slot wrapper and use its child directly.
              let effectiveChild: ReactElement = child;
              if ((child.props as any).asChild) {
                const innerChild = (child.props as any).children;
                if (!isValidElement(innerChild)) {
                  if (process.env.NODE_ENV !== "production") {
                    console.error(
                      `[rst] Slot "${String(slotName)}" with asChild={true} must receive exactly one React element as its child.`,
                    );
                  }
                  return;
                }
                effectiveChild = innerChild as ReactElement;
              }

              if (config.multiple) {
                // Assign an index-based key when the consumer omits one to
                // avoid React's missing-key warning.
                (slotElements[slotName] as ReactElement[]).push(
                  effectiveChild.key != null
                    ? effectiveChild
                    : cloneElement(effectiveChild, { key: index }),
                );
              } else {
                if (
                  process.env.NODE_ENV !== "production" &&
                  slotElements[slotName] !== null &&
                  !config.defaultContent
                ) {
                  console.warn(
                    `Multiple children provided for slot "${String(
                      slotName,
                    )}" but it's not configured to accept multiple children. Only the last child will be used.`,
                  );
                }
                slotElements[slotName] = effectiveChild;
              }
            } else {
              nonSlotChildren.push(child);
            }
          }
        });

        const missingRequiredSlots = (
          Object.keys(slotsConfig) as Array<SlotName>
        )
          .filter((key) => {
            const config = slotsConfig[key];
            if (!config.isRequired) return false;
            // Portal content arrives after commit, so it can't be validated here.
            if (config.portal) return false;
            const slotContent = slotElements[key];
            if (config.multiple) {
              return (slotContent as ReactElement[]).length === 0;
            }
            return slotContent === null;
          })
          .map((key) => String(key));

        if (
          missingRequiredSlots.length > 0 &&
          process.env.NODE_ENV !== "production"
        ) {
          console.error(
            `Required slots missing: ${missingRequiredSlots.join(", ")}`,
          );
        }

        const typeSafeSlots = Object.create(null) as RenderedSlots<S>;
        (Object.keys(slotsConfig) as Array<SlotName>).forEach((key) => {
          const config = slotsConfig[key];
          if (config.portal && portalStoresRef.current) {
            // The slot's position renders live, teleported content via the store.
            typeSafeSlots[key] = (
              <PortalConsumer
                store={portalStoresRef.current[String(key)]}
                multiple={config.multiple}
              />
            ) as any;
          } else {
            typeSafeSlots[key] = slotElements[key] as any;
          }
        });

        const renderResult = renderFn({
          ...props,
          slots: typeSafeSlots,
          nonSlotChildren,
          provideContext,
          portal,
          ref,
        } as any);

        // Compose the providers from the inside out: portal provider first so the
        // registrars and any deeper portal elements can resolve their stores.
        let output: ReactElement = <>{renderResult}</>;

        if (PortalContext !== null && portalStoresRef.current !== null) {
          // Registrars first: their layout effects run before the body's, so a
          // portal element provided at the call site acts as a default that
          // content mounted deeper (e.g. a routed page) overrides.
          output = (
            <PortalContext.Provider value={portalStoresRef.current}>
              {portalRegistrars}
              {renderResult}
            </PortalContext.Provider>
          );
        }

        if (StoreContext !== null && storeRef.current !== null) {
          return (
            <StoreContext.Provider value={storeRef.current}>
              {output}
            </StoreContext.Provider>
          );
        }
        return output;
      });

      Object.entries(slotComponents).forEach(([key, slot]) => {
        defineSlotAccessor(Component, key, slot);
      });

      if (StoreContext !== null) {
        (Component as any).__storeContext = StoreContext;
      }

      // The slot accessors and __storeContext defined above are invisible to
      // TS; the contextual return type carries the real shape.
      return Component as any;
    },
  } satisfies ComponentBuilderWithContext<S, C>;
  return builder;
}
