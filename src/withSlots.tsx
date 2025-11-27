import { Children, isValidElement, ReactElement, ReactNode } from "react";
import {
  ComponentBuilder,
  ExtractSlotComponents,
  RenderedSlots,
  Slot,
  SlotConfig,
} from "./types";

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
  slotsConfig: S
): ComponentBuilder<S> {
  type SlotName = keyof S;

  // STEP 1: Generate slot components with defaults
  // For each slot in the config, either use the provided component or create a default wrapper
  const slotComponents = {} as Record<SlotName, Slot<any>>;
  (Object.keys(slotsConfig) as Array<SlotName>).forEach((slotKey) => {
    const config = slotsConfig[slotKey];
    slotComponents[slotKey] =
      config.component ||
      // Default component: simple wrapper with data-slot-id attribute
      (({ children }: { children?: ReactNode }) => (
        <div data-slot-id={String(slotKey)}>{children}</div>
      ));
  });

  // STEP 2: Create the component factory function
  // This is the core logic that will be used by both withProps and render
  const createComponent = <T extends object>(
    renderFn: (
      props: T & {
        slots: RenderedSlots<S>;
        nonSlotChildren: ReactElement[];
      }
    ) => ReactElement
  ): React.FC<T & { children?: ReactNode }> & ExtractSlotComponents<S> => {
    const Component = ({
      children,
      ...props
    }: T & { children?: ReactNode }) => {
      // Storage for organized slot elements
      const slotElements = {} as {
        [K in SlotName]: ReactElement[] | ReactElement | null;
      };
      const nonSlotChildren: ReactElement[] = [];

      // STEP 2.1: Initialize all slots with empty values or default content
      (Object.keys(slotsConfig) as Array<SlotName>).forEach((slotKey) => {
        const config = slotsConfig[slotKey];
        if (config.multiple) {
          // Multiple slots start as empty array
          slotElements[slotKey] = [];
        } else {
          // Single slots start as null or default content
          slotElements[slotKey] = config.defaultContent ? (
            <>{config.defaultContent}</>
          ) : null;
        }
      });

      // STEP 2.2: Process all children and organize them into slots
      Children.forEach(children, (child) => {
        if (isValidElement(child)) {
          // Check if this child matches any slot component
          // We compare child.type (the component function) to our slot components
          const slotEntry = Object.entries(slotComponents).find(
            ([_, slotComponent]) => slotComponent === child.type
          );

          if (slotEntry) {
            // This child is a slot! Extract its name and config
            const [slotName] = slotEntry as [SlotName, any];
            const config = slotsConfig[slotName];

            if (config.multiple) {
              // For multiple slots, add to the array
              (slotElements[slotName] as ReactElement[]).push(child);
            } else {
              // For single slots, store the element (replaces previous if duplicate)
              // Warn in development if we're overriding a previous value
              if (
                process.env.NODE_ENV !== "production" &&
                slotElements[slotName] !== null &&
                !config.defaultContent
              ) {
                console.warn(
                  `Multiple children provided for slot "${String(
                    slotName
                  )}" but it's not configured to accept multiple children. Only the last child will be used.`
                );
              }
              slotElements[slotName] = child;
            }
          } else {
            // This child doesn't match any slot, collect it as non-slot content
            nonSlotChildren.push(child);
          }
        }
      });

      // STEP 2.3: Validate required slots (only in development)
      const missingRequiredSlots = (Object.keys(slotsConfig) as Array<SlotName>)
        .filter((key) => {
          const config = slotsConfig[key];
          if (!config.isRequired) return false;

          const slotContent = slotElements[key];
          // Check if slot is empty
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
          `Required slots missing: ${missingRequiredSlots.join(", ")}`
        );
      }

      // STEP 2.4: Prepare properly typed slots object for render function
      const typeSafeSlots = {} as RenderedSlots<S>;

      // Copy all slot elements into the type-safe object
      (Object.keys(slotsConfig) as Array<SlotName>).forEach((key) => {
        typeSafeSlots[key] = slotElements[key] as any;
      });

      // STEP 2.5: Call the user's render function with organized data
      const renderProps = {
        ...props,
        slots: typeSafeSlots,
        nonSlotChildren,
      };

      return <>{renderFn(renderProps as any)}</>;
    };

    // STEP 3: Attach slot components as static properties
    // This allows usage like: <Card.Header>...</Card.Header>
    Object.entries(slotComponents).forEach(([key, slot]) => {
      (Component as any)[key] = slot;
    });

    // STEP 4: Return the component with proper typing
    return Component as unknown as React.FC<T & { children?: ReactNode }> &
      ExtractSlotComponents<S>;
  };

  // STEP 5: Return the builder object with render method
  return {
    render: <T extends object = {}>(
      renderFn: (
        props: T & {
          slots: RenderedSlots<S>;
          nonSlotChildren: ReactElement[];
        }
      ) => ReactElement
    ) => createComponent<T>(renderFn),
  };
}
