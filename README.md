# React Slot Component System

A type-safe, flexible slot-based component system for React applications. This system enables the creation of composable components with named "slots" that can be filled by children components.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Key Features](#key-features)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
  - [Basic Usage](#basic-usage)
  - [Multiple Slot Instances](#multiple-slot-instances)
  - [Required Slots](#required-slots)
  - [Default Content](#default-content)
  - [Non-Slot Children](#non-slot-children)
  - [Same Component for Multiple Slots](#same-component-for-multiple-slots)
  - [Nested Slot Components](#nested-slot-components)
  - [Injecting Runtime Props](#injecting-runtime-props)
  - [Static Prop Binding with `withProps`](#static-prop-binding-with-withprops)
- [TypeScript Support](#typescript-support)
- [Best Practices](#best-practices)
- [Real-World Applications](#real-world-applications)

## Overview

This slot component system provides a pattern for building complex, composable components in React with excellent TypeScript inference. Instead of prop drilling or complex component composition, the slots pattern enables a clean, intuitive API for component customization.

```tsx
// Define slots and render function with a fluent API
const Card = createComponentWithSlots({
  Header: {},
  Body: {},
  Footer: {}
}).render<{ className?: string }>(({ slots, className }) => (
  <div className={className}>
    {slots.Header}
    {slots.Body}
    {slots.Footer}
  </div>
));

// Usage
<Card className="my-card">
  <Card.Header>Card Title</Card.Header>
  <Card.Body>Card content goes here</Card.Body>
  <Card.Footer><Button>Action</Button></Card.Footer>
</Card>
```

## Installation

```bash
# Using npm
npm install @mikrostack/rst

# Using yarn
yarn add @mikrostack/rst
```

## Key Features

- **Type-Safe**: Full TypeScript support with proper type inference, including per-slot element types
- **Composable**: Clean, intuitive component composition
- **Multiple Slot Instances**: Support for multiple children of the same slot type, with automatic key assignment
- **Validation**: Required slot validation
- **Default Content**: Support for default slot content
- **Non-Slot Children Handling**: Collect and handle non-matching children
- **Flexible Rendering**: Full control over slot positioning and layout
- **Same Component for Multiple Slots**: Two slots can share the same underlying component — RST uses per-slot Symbols for identity, not component reference
- **`withProps`**: Bind static props to a component at definition time, removing them from the public slot surface
- **`injectSlotProps`**: Typed helper for passing render-function state into a slot without modifying the slots API

## API Reference

### `createComponentWithSlots`

```typescript
function createComponentWithSlots<S extends Record<string, SlotConfig>>(
  slotsConfig: S
): ComponentBuilder<S>
```

Returns a builder object with the `render` method:

#### `builder.render<T>(renderFn)`

Define the component's render function with optional custom props.

```typescript
render<T extends object = {}>(
  render: (props: T & { slots: {...}, nonSlotChildren: ReactElement[] }) => ReactElement
): React.FC<T & { children?: ReactNode }> & ExtractSlotComponents<S>
```

**Type parameter `T`**: Custom component props (defaults to `{}` if omitted)

#### Parameters

**`slotsConfig`**: An object mapping slot names to slot configuration objects. Each configuration can include:
- `component`: Optional custom slot component. If omitted, uses default: `({children}) => <div data-slot-id={name}>{children}</div>`
- `isRequired`: If true, the slot must be provided
- `multiple`: If true, multiple instances of the slot are collected in an array. Children without a `key` receive one automatically based on their index.
- `defaultContent`: Default content to use if the slot is not provided
- `className`: Optional class name applied to the default wrapper `<div>` (ignored when `component` is provided)

**`render`**: Function that renders the component using the organized slots

#### Returns

A React component with slot component functions attached as static properties.

---

### `withProps`

```typescript
function withProps<P extends object, B extends Partial<P>>(
  Component: (props: P) => ReactNode,
  boundProps: B,
): (props: Omit<P, keyof B>) => ReactNode
```

Returns a new component with `boundProps` pre-applied. The bound keys are removed from the returned component's prop surface — the type system correctly reflects what the consumer still needs to provide.

Bound props act as **defaults**: any prop the consumer passes directly on the slot element takes priority and overrides the bound value.

`withProps` is slot-agnostic and can be used anywhere, but it is particularly useful in slot configs to bind static, definition-time values without touching the render function.

---

### `injectSlotProps`

```typescript
function injectSlotProps<P>(
  slot: ReactElement<P> | null,
  props: Partial<P>
): ReactElement<P> | null
```

A typed wrapper around `cloneElement` for passing render-function state (e.g. callbacks, open/close flags) into a slot without changing the `slots.X` API. Returns `null` when the slot is absent, so it is safe to use unconditionally.

```tsx
import { injectSlotProps } from "@mikrostack/rst";

// Instead of: {slots.Dialog}
{injectSlotProps(slots.Dialog, { onClose: () => setOpen(false) })}
```

`injectSlotProps` is the only mechanism for passing runtime props to a slot. The `props` argument is typed against the slot component's own prop type, so mismatched props are caught at compile time.

## Usage Examples

### Basic Usage

```tsx
// 1. Create component with slots (using default wrappers)
const Card = createComponentWithSlots({
  Header: {},  // Uses default: ({children}) => <div data-slot-id="Header">{children}</div>
  Body: {},
  Footer: {}
}).render<{ className?: string }>(({ slots, className }) => (
  <div className={`card ${className || ''}`}>
    {slots.Header}
    {slots.Body}
    {slots.Footer}
  </div>
));

// 2. Usage
function App() {
  return (
    <Card className="custom-card">
      <Card.Header>My Card Title</Card.Header>
      <Card.Body>Card content goes here...</Card.Body>
      <Card.Footer>
        <button>Click me</button>
      </Card.Footer>
    </Card>
  );
}
```

### Component Without Custom Props

Use the `render()` method for components that don't need custom props:

```tsx
const Simple = createComponentWithSlots({
  Header: {},
  Body: {}
}).render(({ slots }) => (
  <div>
    {slots.Header}
    {slots.Body}
  </div>
));

// Usage
<Simple>
  <Simple.Header>Title</Simple.Header>
  <Simple.Body>Content</Simple.Body>
</Simple>
```

### Custom Slot Components

If you need custom styling or behavior, provide a `component`:

```tsx
// Define custom slot component
function HeaderSlot({ children }: PropsWithChildren) {
  return <div className="custom-header">{children}</div>;
}

// Use custom component
const Card = createComponentWithSlots({
  Header: { component: HeaderSlot },  // Custom component
  Body: {},  // Default wrapper
  Footer: {}
}).render(({ slots }) => (
  <div>
    {slots.Header}
    {slots.Body}
    {slots.Footer}
  </div>
));
```

### Multiple Slot Instances

Children of a `multiple` slot that have no `key` prop automatically receive an index-based key, so you don't need to set keys manually.

```tsx
const Tabs = createComponentWithSlots({
  Tab: { multiple: true }
}).render<{ activeTab?: number }>(({ slots, activeTab = 0 }) => (
  <div className="tabs-container">
    <div className="tabs-header">
      {slots.Tab.map((tab, index) => (
        <div key={index} className={`tab ${activeTab === index ? 'active' : ''}`}>
          {tab}
        </div>
      ))}
    </div>
  </div>
));

// Usage
<Tabs activeTab={1}>
  <Tabs.Tab>Tab 1</Tabs.Tab>
  <Tabs.Tab>Tab 2</Tabs.Tab>
  <Tabs.Tab>Tab 3</Tabs.Tab>
</Tabs>
```

### Required Slots

```tsx
const Form = createComponentWithSlots({
  Fields: { isRequired: true }
}).render(({ slots }) => (
  <form>
    {slots.Fields}
  </form>
));

// Missing Form.Fields causes a console error in development
<Form>
  <Form.Fields>...</Form.Fields>
</Form>
```

### Default Content

```tsx
const Panel = createComponentWithSlots({
  Body: {},
  Footer: {
    defaultContent: <div className="default-footer">© 2025 Company Inc.</div>
  }
}).render(({ slots }) => (
  <div>
    {slots.Body}
    {slots.Footer}
  </div>
));

// Footer shows default content when not provided
<Panel>
  <Panel.Body>Main content</Panel.Body>
</Panel>
```

### Non-Slot Children

```tsx
const Layout = createComponentWithSlots({
  Header: {},
  Sidebar: {},
  Footer: {}
}).render(({ slots, nonSlotChildren }) => (
  <div className="layout">
    {slots.Header}
    <div className="content">
      {slots.Sidebar}
      <main>
        {nonSlotChildren}
      </main>
    </div>
    {slots.Footer}
  </div>
));

// Usage
<Layout>
  <Layout.Header>Site Header</Layout.Header>
  <Layout.Sidebar>Navigation</Layout.Sidebar>
  <div>Main content section 1</div>
  <div>Main content section 2</div>
  <Layout.Footer>Site Footer</Layout.Footer>
</Layout>
```

### Same Component for Multiple Slots

Two slots can share the same underlying component. RST identifies slots by a per-slot Symbol assigned at registration time — not by component reference — so there is no ambiguity. Use `injectSlotProps` in the render function to pass slot-specific props at render time:

```tsx
function SidebarSlot({ side, children }: { side: "left" | "right"; children?: ReactNode }) {
  return <aside className={`sidebar sidebar--${side}`}>{children}</aside>;
}

const Layout = createComponentWithSlots({
  LeftSidebar:  { component: SidebarSlot },
  RightSidebar: { component: SidebarSlot },
  Body: {},
}).render(({ slots }) => (
  <div className="layout">
    {injectSlotProps(slots.LeftSidebar,  { side: "left"  })}
    {slots.Body}
    {injectSlotProps(slots.RightSidebar, { side: "right" })}
  </div>
));

// Both slots resolve correctly even though they share SidebarSlot
<Layout>
  <Layout.LeftSidebar>Nav</Layout.LeftSidebar>
  <Layout.RightSidebar>Aside</Layout.RightSidebar>
</Layout>
```

### Nested Slot Components

A slot whose `component` is itself a slotted component automatically exposes the inner component's slots as static properties, so consumers can address them with a chained path:

```tsx
const Header = createComponentWithSlots({
  Title: {},
  Actions: { multiple: true },
}).render(({ slots }) => (
  <header>
    {slots.Title}
    <div className="actions">{slots.Actions}</div>
  </header>
));

const Page = createComponentWithSlots({
  Header: { component: Header },
  Body: {},
}).render(({ slots }) => (
  <div>
    {slots.Header}
    {slots.Body}
  </div>
));

// Usage — chained slot access
<Page>
  <Page.Header>
    <Page.Header.Title>My Page</Page.Header.Title>
    <Page.Header.Actions>
      <button>Save</button>
    </Page.Header.Actions>
  </Page.Header>
  <Page.Body>Content</Page.Body>
</Page>
```

### Static Prop Binding with `withProps`

`withProps` binds static props at definition time. The render function stays clean, and the bound keys disappear from the slot's public prop surface.

```tsx
import { createComponentWithSlots, withProps } from "@mikrostack/rst";

function SidebarSlot({ side, children }: { side: "left" | "right"; children?: ReactNode }) {
  return <aside className={`sidebar sidebar--${side}`}>{children}</aside>;
}

// Without withProps — side must be injected at render time
const Layout = createComponentWithSlots({
  LeftSidebar:  { component: SidebarSlot },
  RightSidebar: { component: SidebarSlot },
}).render(({ slots }) => (
  <div>
    {injectSlotProps(slots.LeftSidebar,  { side: "left"  })}
    {injectSlotProps(slots.RightSidebar, { side: "right" })}
  </div>
));

// With withProps — side is bound at definition time, render function stays clean
const Layout = createComponentWithSlots({
  LeftSidebar:  { component: withProps(SidebarSlot, { side: "left"  }) },
  RightSidebar: { component: withProps(SidebarSlot, { side: "right" }) },
}).render(({ slots }) => (
  <div>
    {slots.LeftSidebar}
    {slots.RightSidebar}
  </div>
));

// Usage — side is no longer part of the slot's public API
<Layout>
  <Layout.LeftSidebar>Nav</Layout.LeftSidebar>
  <Layout.RightSidebar>Aside</Layout.RightSidebar>
</Layout>
```

| | `withProps` | `injectSlotProps` |
|---|---|---|
| When | Definition time | Render time |
| Input | Component + static props | Element + dynamic props |
| Returns | New component type | Cloned element |
| Use case | Props that never change | Props that depend on render state |

### Injecting Runtime Props

Use `injectSlotProps` to forward render-function state (callbacks, open flags, refs) into a slot without altering the `slots.X` shape:

```tsx
import { createComponentWithSlots, injectSlotProps } from "@mikrostack/rst";

function DialogSlot({ onClose, children }: { onClose?: () => void; children?: ReactNode }) {
  return (
    <dialog>
      {children}
      <button onClick={onClose}>Close</button>
    </dialog>
  );
}

const Page = createComponentWithSlots({
  Dialog: { component: DialogSlot },
}).render(({ slots }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && injectSlotProps(slots.Dialog, { onClose: () => setOpen(false) })}
    </div>
  );
});

// Usage
<Page>
  <Page.Dialog>Dialog content here</Page.Dialog>
</Page>
```

## TypeScript Support

The system provides full TypeScript support with excellent type inference:

- Slot configuration is inferred from the `slotsConfig` argument
- Component props are explicitly specified via `render<T>()`
- Slot availability is enforced in the render function
- Multiple slots are correctly typed as arrays
- Required slots are enforced
- Each `slots.X` is typed to `ReactElement<ComponentProps>` based on the slot's `component` — not `ReactElement<any>`
- `injectSlotProps` infers its `props` argument from the element type, so mismatched props are caught at compile time

Example of TypeScript inference:

```tsx
function TitleSlot({ level, children }: { level: 1 | 2; children?: ReactNode }) {
  const Tag = `h${level}` as const;
  return <Tag>{children}</Tag>;
}

// Slots are inferred, props are explicit
const Modal = createComponentWithSlots({
  Title: { component: TitleSlot },
  Body: {},
  Actions: { multiple: true }
}).render<{ isOpen: boolean; onClose: () => void }>(
  // slots will have proper typing based on configuration:
  // - Title:   ReactElement<{ level: 1 | 2; children?: ReactNode }> | null
  // - Body:    ReactElement<{ children?: ReactNode }> | null
  // - Actions: ReactElement<{ children?: ReactNode }>[]  (because multiple: true)
  ({ slots, isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
      <div className="modal">
        {slots.Title}
        {slots.Body}
        <div className="actions">
          {slots.Actions}
        </div>
      </div>
    );
  }
);
```

## Best Practices

1. **Use default wrappers for simple slots**: Let the system generate `({children}) => <div data-slot-id={name}>{children}</div>` automatically
2. **Provide custom components only when needed**: Only specify `component` when you need custom styling, logic, or structure
3. **Use meaningful slot names**: Names should reflect their purpose (Header, Body, Footer, etc.)
4. **Consider required slots**: Mark slots as required when they're essential for functionality
5. **Provide sensible defaults**: Use default content for optional slots with common patterns
6. **Handle non-slot children appropriately**: Have a plan for how to deal with non-slot children
7. **Use `withProps` for static prop binding**: Prefer `withProps` over `injectSlotProps` when the bound values never change — it keeps the render function clean and makes the contract explicit at the config level
8. **Use `injectSlotProps` for runtime props**: This is the mechanism for passing render-time data (callbacks, open flags) into a slot; keep slot components focused on structure, not state

## Real-World Applications

The slots pattern is particularly useful for:

- **Layout components**: Cards, panels, dialogs, modals
- **Complex UI components**: Tabs, accordions, dashboards
- **Form components**: Input groups, form sections
- **Data visualization**: Charts with customizable legends, tooltips
- **Application shells**: Headers, footers, sidebars, navigation

By using the slots pattern, you can create flexible, reusable components that are easy to customize and maintain.

## Migration Guide

### Upgrading from v0.0.x to v1.0.0

Version 1.0.0 introduces a breaking change to improve TypeScript inference. The API now uses a curried/fluent pattern.

**Old API (v0.0.x):**
```tsx
const Card = createComponentWithSlots<
  { className: string },
  typeof slotsConfig
>(
  slotsConfig,
  ({ slots, className }) => <div>{slots.Header}</div>
);
```

**New API (v1.0.0+):**
```tsx
// With custom props
const Card = createComponentWithSlots(slotsConfig)
  .render<{ className: string }>(({ slots, className }) => (
    <div>{slots.Header}</div>
  ));

// Without custom props (omit type parameter)
const Card = createComponentWithSlots(slotsConfig)
  .render(({ slots }) => <div>{slots.Header}</div>);
```

**Key Changes:**
1. `createComponentWithSlots` now takes only one parameter (the slots config)
2. Chain `.render<T>()` to define the component (T defaults to `{}`)
3. Specify custom props via type parameter: `.render<{ className: string }>()`
4. Omit type parameter when no custom props needed: `.render()`
5. The `WithSlots` helper type has been removed (no longer needed)
