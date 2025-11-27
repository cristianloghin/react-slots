import {
  Children,
  ForwardRefExoticComponent,
  isValidElement,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";

// Configuration types for slot system
interface SlotConfig {
  isRequired?: boolean;
  multiple?: boolean;
  defaultContent?: ReactNode;
}

// Base slot function type
type Slot<T, E extends HTMLElement = HTMLElement> =
  | ((props: T) => ReactNode)
  | ForwardRefExoticComponent<PropsWithChildren<T> & RefAttributes<E>>;

export type SlotProps<T extends Record<string, Slot<any>>> = {
  [K in keyof T]: Parameters<T[K]>[0];
};

// Enhancing the core function with better typing and features
export function createComponentWithSlots<
  T extends object,
  S extends Record<string, Slot<any>>
>(
  slots: S,
  slotConfig: { [K in keyof S]?: SlotConfig } = {},
  render: (
    props: T & {
      slots: {
        [K in keyof S]: K extends keyof typeof slotConfig
          ? (typeof slotConfig)[K] extends { multiple: true }
            ? ReactElement[]
            : (typeof slotConfig)[K] extends { defaultContent: infer D }
            ? ReactElement | null
            : ReactElement | null
          : ReactElement | null;
      };
      nonSlotChildren: ReactElement[];
    }
  ) => ReactElement
) {
  type SlotName = keyof S;

  const Component = ({ children, ...props }: T & { children?: ReactNode }) => {
    // Initialize slot storage with type safety
    const slotElements = {} as {
      [K in SlotName]: ReactElement[] | ReactElement | null;
    };
    const nonSlotChildren: ReactElement[] = [];

    // Initialize all slots with null or default content
    (Object.keys(slots) as Array<SlotName>).forEach((slotKey) => {
      const config = slotConfig[slotKey] || {};
      if (config.multiple) {
        slotElements[slotKey] = [];
      } else {
        slotElements[slotKey] = config.defaultContent ? (
          <>{config.defaultContent}</>
        ) : null;
      }
    });

    // Process all children
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        const slotEntry = Object.entries(slots).find(
          ([_, slotComponent]) => slotComponent === child.type
        );

        if (slotEntry) {
          const [slotName] = slotEntry as [SlotName, any];
          const config = slotConfig[slotName] || {};

          // Handle multiple slots
          if (config.multiple) {
            (slotElements[slotName] as ReactElement[]).push(child);
          } else {
            // For non-multiple slots, use the latest one
            // Add a console warning in development if overriding
            if (
              process.env.NODE_ENV !== "production" &&
              slotElements[slotName] !== null
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
          // Collect children that don't match any slot
          nonSlotChildren.push(child);
        }
      }
    });

    // Validate required slots
    const missingRequiredSlots = (Object.keys(slotConfig) as Array<SlotName>)
      .filter((key) => {
        const config = slotConfig[key];
        if (!config?.isRequired) return false;

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
        `Required slots missing: ${missingRequiredSlots.join(", ")}`
      );
    }

    // Prepare type-safe render props
    const typeSafeSlots = {} as {
      [K in keyof S]: K extends keyof typeof slotConfig
        ? (typeof slotConfig)[K] extends { multiple: true }
          ? ReactElement[]
          : (typeof slotConfig)[K] extends { defaultContent: infer D }
          ? ReactElement | null
          : ReactElement | null
        : ReactElement | null;
    };

    // Convert slot elements to their proper types based on configuration
    (Object.keys(slots) as Array<SlotName>).forEach((key) => {
      const config = slotConfig[key] || {};
      if (config.multiple) {
        typeSafeSlots[key] = slotElements[key] as any;
      } else {
        typeSafeSlots[key] = slotElements[key] as any;
      }
    });

    const renderProps = {
      ...props,
      slots: typeSafeSlots,
      nonSlotChildren,
    };

    return <>{render(renderProps as any)}</>;
  };

  // Attach slot components as static properties
  Object.entries(slots).forEach(([key, slot]) => {
    (Component as any)[key] = slot;
  });

  return Component as unknown as React.FC<T & { children?: ReactNode }> & S;
}
