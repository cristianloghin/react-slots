import {
  ForwardRefExoticComponent,
  MemoExoticComponent,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";

// Base slot function type
export type Slot<T, E extends HTMLElement = HTMLElement> =
  | ((props: T) => ReactNode)
  | ForwardRefExoticComponent<PropsWithChildren<T> & RefAttributes<E>>
  | MemoExoticComponent<(props: T) => ReactNode>;

// Combined slot configuration
export interface SlotConfig<T = any> {
  component?: Slot<T>;
  isRequired?: boolean;
  multiple?: boolean;
  defaultContent?: ReactNode;
}

/**
 * Type utility: Extracts the slot component functions from the config
 *
 * For each slot in the config:
 * - If a custom component is provided, use that component's type
 * - Otherwise, use the default wrapper type: Slot<{ children?: ReactNode }>
 *
 * This is used for the return type to attach slot components as static properties
 * Example: Card.Header, Card.Body, etc.
 */
export type ExtractSlotComponents<S extends Record<string, SlotConfig>> = {
  [K in keyof S]: S[K]["component"] extends Slot<any>
    ? S[K]["component"]
    : Slot<{ children?: ReactNode }>;
};

/**
 * Type utility: Determines the type of rendered slot content based on config
 *
 * For each slot:
 * - If `multiple: true`, the slot is an array: ReactElement[]
 * - Otherwise, the slot is a single element or null: ReactElement | null
 *
 * This is used for the `slots` object passed to the render function
 */
export type RenderedSlots<S extends Record<string, SlotConfig>> = {
  [K in keyof S]: S[K] extends { multiple: true }
    ? ReactElement[]
    : ReactElement | null;
};

/**
 * Builder interface returned by createComponentWithSlots
 * Allows fluent API for defining component props after slots are configured
 */
export interface ComponentBuilder<S extends Record<string, SlotConfig>> {
  /**
   * Define component render function with optional custom props
   * @param render - Render function receiving props, slots, and nonSlotChildren
   *
   * @example
   * ```tsx
   * // Without custom props
   * .render(({ slots }) => <div>{slots.Header}</div>)
   *
   * // With custom props
   * .render<{ className: string }>(({ slots, className }) => <div>{slots.Header}</div>)
   * ```
   */
  render<T extends object = {}>(
    render: (
      props: T & {
        slots: RenderedSlots<S>;
        nonSlotChildren: ReactElement[];
      }
    ) => ReactElement
  ): React.FC<T & { children?: ReactNode }> & ExtractSlotComponents<S>;
}
