import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  ReactElement,
  ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import {
  ComponentBuilder,
  ComponentBuilderWithContext,
  ContextComponent,
  ExtractSlotComponents,
  RenderedSlots,
  Slot,
  SlotConfig,
} from "./types";
import { SlotContextStore } from "./SlotContextStore";

const SLOT_KEY = Symbol("rst-slot");

/**
 * Creates a component builder with a slot-based composition pattern
 *
 * @param slotsConfig - Configuration object mapping slot names to their config
 * @returns A builder with render<T>() method
 *
 * @example
 * ```tsx
 * // With custom props
 * const Card = createComponentWithSlots({ Header: {}, Body: {} })
 *   .render<{ className: string }>(({ slots, className }) => (
 *     <div className={className}>{slots.Header}{slots.Body}</div>
 *   ));
 *
 * // Without custom props
 * const Simple = createComponentWithSlots({ Header: {} })
 *   .render(({ slots }) => <div>{slots.Header}</div>);
 * ```
 */
export function createComponentWithSlots<S extends Record<string, SlotConfig>>(
  slotsConfig: S,
): ComponentBuilder<S>;

export function createComponentWithSlots<S extends Record<string, SlotConfig>, C extends object>(
  slotsConfig: S,
  options: { context: C },
): ComponentBuilderWithContext<S, C>;

export function createComponentWithSlots<S extends Record<string, SlotConfig>, C extends object>(
  slotsConfig: S,
  options?: { context: C },
): ComponentBuilder<S> | ComponentBuilderWithContext<S, C> {
  type SlotName = keyof S;

  // Each slot gets a unique per-instance Symbol so two slots sharing the same
  // component type can still be distinguished during child collection.
  const slotComponents = {} as Record<SlotName, Slot<any>>;
  (Object.keys(slotsConfig) as Array<SlotName>).forEach((slotKey) => {
    const config = slotsConfig[slotKey];
    const slotSymbol = Symbol(String(slotKey));

    let wrapper: Slot<any>;
    if (config.component) {
      const Base = config.component as any;
      // Strip asChild before forwarding — it is consumed during child collection
      // and must not leak through to the underlying component.
      wrapper = ({ children, asChild: _, ...userProps }: any) => (
        <Base {...userProps}>
          {children}
        </Base>
      );
      // Copy static properties (e.g. nested slot components) so that
      // Parent.SlottedChild.NestedSlot resolves correctly at runtime.
      Object.assign(wrapper, Base);
    } else {
      wrapper = ({ children, asChild: _ }: { children?: ReactNode; asChild?: boolean }) => (
        <>{children}</>
      );
    }

    (wrapper as any)[SLOT_KEY] = slotSymbol;
    slotComponents[slotKey] = wrapper;
  });

  const contextDefaults = options?.context;
  // The context object is created once per createComponentWithSlots call and shared
  // across all instances. Each instance provides its own store via the Provider.
  // The default value (used when no Provider is in the tree) is a store initialised
  // with the declared defaults, so useSlotContext never returns undefined.
  const StoreContext = contextDefaults !== undefined
    ? createContext<SlotContextStore<C>>(new SlotContextStore<C>(contextDefaults))
    : null;

  return {
    render: <T extends object = {}>(
      renderFn: (
        props: T & {
          slots: RenderedSlots<S>;
          nonSlotChildren: ReactElement[];
          provideContext: (value: C) => void;
        },
      ) => ReactElement,
    ) => {
      const Component = ({
        children,
        ...props
      }: T & { children?: ReactNode }) => {
        // Per-instance store — lazily initialised on first render so each mounted
        // instance of this component has its own isolated context.
        const storeRef = useRef<SlotContextStore<C> | null>(null);
        if (storeRef.current === null && contextDefaults !== undefined) {
          storeRef.current = new SlotContextStore<C>(contextDefaults);
        }

        // provideContext captures the value during render; the layout effect
        // pushes it to the store after the commit so store.set is never called
        // during a React render pass.
        const pendingContextRef = useRef<C | null>(null);
        const provideContext = useCallback((value: C) => {
          pendingContextRef.current = value;
        }, []);

        useLayoutEffect(() => {
          if (storeRef.current !== null && pendingContextRef.current !== null) {
            storeRef.current.set(pendingContextRef.current);
            pendingContextRef.current = null;
          }
        });

        const slotElements = {} as {
          [K in SlotName]: ReactElement[] | ReactElement | null;
        };
        const nonSlotChildren: ReactElement[] = [];

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
                  effectiveChild.key != null ? effectiveChild : cloneElement(effectiveChild, { key: index }),
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

        const missingRequiredSlots = (Object.keys(slotsConfig) as Array<SlotName>)
          .filter((key) => {
            const config = slotsConfig[key];
            if (!config.isRequired) return false;
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

        const typeSafeSlots = {} as RenderedSlots<S>;
        (Object.keys(slotsConfig) as Array<SlotName>).forEach((key) => {
          typeSafeSlots[key] = slotElements[key] as any;
        });

        const renderResult = renderFn({
          ...props,
          slots: typeSafeSlots,
          nonSlotChildren,
          provideContext,
        } as any);

        if (StoreContext !== null && storeRef.current !== null) {
          return (
            <StoreContext.Provider value={storeRef.current}>
              {renderResult}
            </StoreContext.Provider>
          );
        }
        return <>{renderResult}</>;
      };

      Object.entries(slotComponents).forEach(([key, slot]) => {
        (Component as any)[key] = slot;
      });

      if (StoreContext !== null) {
        (Component as any).__storeContext = StoreContext;
      }

      return Component as unknown as React.FC<T & { children?: ReactNode }> &
        ExtractSlotComponents<S> &
        ContextComponent<C>;
    },
  };
}
