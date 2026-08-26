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
  - [Reading Slot Props with `getSlotProps`](#reading-slot-props-with-getslotprops)
  - [Static Prop Binding with `withProps`](#static-prop-binding-with-withprops)
  - [Remote Slot Ownership with `asChild`](#remote-slot-ownership-with-aschild)
  - [Typed Slot Context with `useSlotContext`](#typed-slot-context-with-useslotcontext)
  - [Decoupled Context Modules with `createSlotContext`](#decoupled-context-modules-with-createslotcontext)
  - [Dot-path Slot Keys](#dot-path-slot-keys)
  - [Reusable Slot Groups with `defineSlotGroup`](#reusable-slot-groups-with-defineslotgroup)
  - [Checking Slot Content with `isSlotFilled`](#checking-slot-content-with-isslotfilled)
  - [Teleporting Content with Portal Slots](#teleporting-content-with-portal-slots)
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
- **`withProps`**: Bind static props to a component at definition time, making them optional on the public slot surface
- **`asChild`**: Prop on any slot component that lets a remote component (with its own state and queries) fill the slot without co-location
- **`injectSlotProps`**: Typed helper for passing render-function state into a slot without modifying the slots API
- **`useSlotContext`**: Typed hook for slot components to consume parent render state without manually wiring React context outside the slot system
- **Dot-path slot keys**: Define hierarchical slot namespaces (`"Header.Title"`) that automatically generate nested static accessors (`Page.Header.Title`) while keeping the render-function API flat (`slots["Header.Title"]`)
- **`prefixSlots`**: Low-level helper that prefixes a slot config record — the primitive on which `defineSlotGroup` is built
- **`defineSlotGroup`**: Encapsulates a group of related slots (config + render logic) into a reusable unit that can be spread into any parent slot config
- **`isSlotFilled`**: Checks whether a slot has content — supports exact keys, key arrays, and wildcard prefix matching, with `all`/`some` semantics
- **Portal slots (`portal: true`)**: A slot that can be filled from *anywhere* beneath the layout — including across a render boundary such as a React Router `<Outlet />` — using the same `<Layout.X>` call-site syntax. Content teleports to the slot's position via an external store, so updates re-render only the slot, never the heavy content around it

## API Reference

### `createComponentWithSlots`

```typescript
// Without context
function createComponentWithSlots<S extends Record<string, SlotConfig>>(
  slotsConfig: S
): ComponentBuilder<S>

// With context — plain defaults object, or a standalone context
function createComponentWithSlots<S extends Record<string, SlotConfig>, C extends object>(
  slotsConfig: S,
  options: { context: C | SlotContext<C> }
): ComponentBuilderWithContext<S, C>
```

Returns a builder object with the `render` method.

#### `builder.render<T>(renderFn)`

Define the component's render function with optional custom props.

```typescript
// Without context
render<T extends object = {}>(
  render: (props: T & { slots: {...}; nonSlotChildren: ReactElement[]; portal: PortalHelper<S> }) => ReactElement
): React.FC<T & { children?: ReactNode }> & ExtractSlotComponents<S>

// With context — render function also receives provideContext
render<T extends object = {}>(
  render: (props: T & { slots: {...}; nonSlotChildren: ReactElement[]; provideContext: (value: C) => void; portal: PortalHelper<S> }) => ReactElement
): React.FC<T & { children?: ReactNode }> & ExtractSlotComponents<S> & ContextComponent<C>
```

The render function always receives `portal`, a presence-aware boundary helper for portal slots — see [Teleporting Content with Portal Slots](#teleporting-content-with-portal-slots). It is a no-op for components that declare no `{ portal: true }` slots.

**Type parameter `T`**: Custom component props (defaults to `{}` if omitted)

#### Parameters

**`slotsConfig`**: An object mapping slot names to slot configuration objects. Each configuration can include:
- `component`: Optional custom slot component. If omitted, the slot's content renders directly without a wrapper element.
- `isRequired`: If true, the slot must be provided
- `multiple`: If true, multiple instances of the slot are collected in an array. Children without a `key` receive one automatically based on their index.
- `defaultContent`: Default content to use if the slot is not provided
- `portal`: If true, the slot is filled by `<Layout.X>` elements rendered anywhere beneath the layout — including across a render boundary like a React Router `<Outlet />` — rather than from the layout's direct children. See [Teleporting Content with Portal Slots](#teleporting-content-with-portal-slots).

**`options.context`** *(optional)*: An object defining the shape and default values of the slot context, or a standalone context created by [`createSlotContext`](#createslotcontext). When provided, RST creates a scoped store for this component and makes `provideContext` available in the render function. The default values are used as the initial store state and as the fallback when `useSlotContext` is called outside a provider. Prefer the `createSlotContext` form when slot components live in their own modules — see [Decoupled Context Modules with `createSlotContext`](#decoupled-context-modules-with-createslotcontext).

**`render`**: Function that renders the component using the organized slots. When context is configured, also receives `provideContext` — call it with the current context values on every render.

#### Returns

A React component with slot component functions attached as static properties. When context is configured, the returned component also carries `__storeContext` for use with `useSlotContext`.

---

### `withProps`

```typescript
function withProps<P extends object, K extends keyof P>(
  Component: (props: P) => ReactNode,
  boundProps: Pick<P, K>,
): (props: Omit<P, K> & Partial<Pick<P, K>>) => ReactNode
```

Returns a new component with `boundProps` pre-applied. The bound keys become optional on the returned component's prop surface — the consumer no longer needs to provide them, but may still override them (including via `injectSlotProps` at the layout's render site).

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

---

### `getSlotProps`

```typescript
function getSlotProps<P, T>(
  slot: ReactElement<P> | readonly ReactElement<P>[] | null | undefined,
  select: (props: P) => T,
): T[]
```

The read counterpart to `injectSlotProps`: selects a value from the props of every collected element in a slot. Works uniformly over single slots (`ReactElement | null`) and multiple slots (`ReactElement[]`), returning one selected value per element in collection order — an empty array when the slot is unfilled — so presence and value checks compose with ordinary array methods.

```tsx
import { getSlotProps } from "@mikrostack/rst";

.render(({ slots }) => {
  // Layout reacts to consumer-controlled slot state without owning it.
  const isFormOpen = getSlotProps(slots.Form, (p) => p.open).some(Boolean);

  return (
    <header data-form-open={isFormOpen}>
      {!isFormOpen && slots.Title}
      {slots.Form}
    </header>
  );
})
```

The selector runs during render, so the result always reflects the current committed props — reactivity is ordinary top-down prop flow, no subscription involved. When the slot has a configured component, `P` is inferred from it; for componentless slots, annotate the selector parameter (`(p: FormProps) => p.open`).

Caveats: a slot used with `asChild` collects the dissolved child, whose props need not match the slot component's prop type; portal slots resolve to a live boundary element whose props are meaningless to read; `defaultContent` on a componentless slot is wrapped in a Fragment.

---

### `isSlotFilled`

```typescript
function isSlotFilled(
  slots: Record<string, ReactNode | ReactNode[]>,
  pattern: string | string[],
  all?: boolean,
): boolean
```

Checks whether a slot or group of slots has content. Handles both single slots (`null` check) and multiple slots (non-empty array check) transparently. Pass the `slots` object from the render function as the first argument.

**`pattern`** — one of:
- **Exact key** (`"Header.Title"`) — checks a single slot. `all` is ignored.
- **Key array** (`["Header.Title", "Header.Action"]`) — checks an explicit set of slots.
- **Wildcard** (`"Header*"`) — checks all slots whose key starts with the prefix before `*`.

**`all`** *(optional, default `false`)* — when using a key array or wildcard:
- `false` — returns `true` if **at least one** matching slot is filled
- `true` — returns `true` only if **all** matching slots are filled

```tsx
import { isSlotFilled } from "@mikrostack/rst";

.render(({ slots }) => {
  const hasHeader = isSlotFilled(slots, "Header*");
  const hasTitleOrActions = isSlotFilled(slots, ["Header.Title", "Header.Action"]);
  const allHeadersFilled = isSlotFilled(slots, "Header*", true);

  return (
    <div>
      {hasHeader && (
        <header>
          {hasTitleOrActions && (
            <div className="title-row">
              {slots["Header.Title"]}
              {isSlotFilled(slots, "Header.Action") && (
                <div className="actions">{slots["Header.Action"]}</div>
              )}
            </div>
          )}
          {slots["Header.Form"]}
        </header>
      )}
    </div>
  );
})
```

---

### `createSlotContext`

```typescript
function createSlotContext<C extends object>(defaults: C): SlotContext<C>
```

Creates a standalone slot context that lives independently of the layout that provides it. Pass it to `createComponentWithSlots(config, { context })` in place of a plain defaults object, and consume it with `useSlotContext(theContext, …)`.

Use this whenever a slot component lives in its own module. The layout's slot config reads component bindings eagerly at module evaluation, so a slot component importing its layout back (to call `useSlotContext(Layout, …)`) creates an import cycle that breaks bundler HMR. A standalone context is a leaf module both sides can import. See [Decoupled Context Modules with `createSlotContext`](#decoupled-context-modules-with-createslotcontext).

**`defaults`**: The context shape and initial values — same semantics as the plain-object `context` option: used as each instance's initial store state, and as the fallback when `useSlotContext` is called outside a provider.

---

### `useSlotContext`

```typescript
// Selector overload — recommended
function useSlotContext<C extends object, T>(
  layout: ContextComponent<C>,
  selector: (value: C) => T,
): T

// Full-shape overload
function useSlotContext<C extends object>(
  layout: ContextComponent<C>,
): C
```

Reads a value from the typed slot context of a layout component. Must be called from inside a component that is rendered within the layout's slot tree.

**`layout`**: The slotted component returned by `createComponentWithSlots(..., { context })`, or the `SlotContext` object the layout was configured with. Passing a component without a context option is a compile-time error.

**`selector`** *(optional)*: A function that picks a specific value from the context shape. Re-renders the caller only when the selected value changes. Omit to subscribe to the full context object — the caller then re-renders on any context update.

The selector form is strongly preferred when only one or two values are needed. It keeps re-renders scoped and makes the consumed values explicit at the call site.

When called outside any instance of `layout`, `useSlotContext` returns the default values declared in the `context` option.

---

### `prefixSlots`

```typescript
function prefixSlots<Prefix extends string, S extends Record<string, SlotConfig>>(
  prefix: Prefix,
  config: S,
): PrefixedConfig<Prefix, S>
```

Returns a new slot config record with every key prefixed by `prefix + "."`. This is the low-level primitive used by `defineSlotGroup`; reach for it when you need to merge prefixed config manually or build a custom group abstraction.

```ts
import { prefixSlots } from "@mikrostack/rst";

const headerConfig = prefixSlots("Header", {
  Title: {},
  Actions: { multiple: true },
});
// → { "Header.Title": {}, "Header.Actions": { multiple: true } }
```

---

### `defineSlotGroup`

```typescript
function defineSlotGroup<Prefix extends string, S extends Record<string, SlotConfig>>(
  prefix: Prefix,
  config: S,
  renderFn: (args: { slots: RenderedSlots<PrefixedConfig<Prefix, S>> }) => ReactElement,
): {
  config: () => PrefixedConfig<Prefix, S>;
  render: (slots: RenderedSlots<PrefixedConfig<Prefix, S>>) => ReactElement;
}
```

Packages a group of related slots together with their render logic into a reusable unit. The returned object has two members:

**`.config()`**: Returns the prefixed slot config — spread it into a parent's slot config.

**`.render(slots)`**: Calls the group's render function with the parent's fully resolved `slots` object. Call this from the parent's render function wherever the group's output should appear.

Multiple groups can be spread into the same parent without conflict as long as their prefixes differ.

---

## Usage Examples

### Basic Usage

```tsx
// 1. Create component with slots (using default wrappers)
const Card = createComponentWithSlots({
  Header: {},
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

Children of a `multiple` slot that have no `key` prop automatically receive an index-based key. Rendering the collected array directly causes no React key warnings.

```tsx
const TagList = createComponentWithSlots({
  Tag: { multiple: true },
}).render(({ slots }) => (
  <div className="tags">
    {slots.Tag}
  </div>
));

// No key props needed on the children
<TagList>
  <TagList.Tag>React</TagList.Tag>
  <TagList.Tag>TypeScript</TagList.Tag>
  <TagList.Tag>RST</TagList.Tag>
</TagList>
```

If you wrap each collected element in a container inside the render function, those wrapper elements need their own keys as usual:

```tsx
const Tabs = createComponentWithSlots({
  Tab: { multiple: true },
}).render<{ activeTab?: number }>(({ slots, activeTab = 0 }) => (
  <div className="tabs">
    {slots.Tab.map((tab, index) => (
      <div key={index} className={activeTab === index ? "tab tab--active" : "tab"}>
        {tab}
      </div>
    ))}
  </div>
));
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

### Remote Slot Ownership with `asChild`

A slot's content often needs to live in a separate file — it has its own queries, mutations, and local state that don't belong at the callsite. `asChild` lets a remote component fill a slot without the parent knowing anything about it, and without the remote component knowing which layout it is used in.

```tsx
// Layout definition
const PageLayout = createComponentWithSlots({
  Header: { isRequired: true },
  Body: {},
}).render(({ slots }) => (
  <div>
    <div className="header">{slots.Header}</div>
    <div className="body">{slots.Body}</div>
  </div>
));

// Remote component — owns its own state, unaware of PageLayout
function RouterHeader({ routerId }: { routerId: number }) {
  const { data } = useRouterData(routerId); // its own query
  const [open, setOpen] = useState(false);  // its own state
  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => setOpen(true)}>Options</button>
    </div>
  );
}

// Usage — slot identity is explicit at the callsite; RouterHeader has no coupling to PageLayout
<PageLayout>
  <PageLayout.Header asChild>
    <RouterHeader routerId={42} />
  </PageLayout.Header>
  <PageLayout.Body>Content</PageLayout.Body>
</PageLayout>
```

**Semantics:**
- `asChild` is only valid on slot components — not on the parent layout itself
- The child must be a single React element; a non-element child logs an error in development
- The slot wrapper dissolves at collection time — `RouterHeader` renders directly in the slot position
- All other slot config (`isRequired`, `multiple`, `defaultContent`) applies to the slot position as normal; `asChild` only affects how the content is collected
- Works with `multiple` slots — each `asChild` wrapper is treated as one instance

**Nested slotted components:**

`asChild` bypasses exactly one level — the slot component whose `asChild` prop is set. If that slot's `component` is itself a slotted component, the remote component must still respect its slot contract.

```tsx
// PageTitle is a slotted component used as PageHeader's Title slot component
const PageTitle = createComponentWithSlots({
  Icon: {},
  Heading: { isRequired: true },
}).render(({ slots }) => (
  <header>
    {slots.Icon}
    {slots.Heading}
  </header>
));

const PageHeader = createComponentWithSlots({
  Title: { component: PageTitle, isRequired: true },
  Form: {},
}).render(/* ... */);

const Page = createComponentWithSlots({
  Header: { component: PageHeader },
  Body: {},
}).render(/* ... */);

// ✓ asChild on Page.Header — PageHeader is bypassed.
// RemoteHeader controls the layout, but must still satisfy PageTitle's contract
// when using Page.Header.Title inside it.
function RemoteHeader() {
  return (
    <div>
      <Page.Header.Title>
        <Page.Header.Title.Heading>Dashboard</Page.Header.Title.Heading>
      </Page.Header.Title>
      <Page.Header.Form>...</Page.Header.Form>
    </div>
  );
}

<Page>
  <Page.Header asChild>
    <RemoteHeader />
  </Page.Header>
</Page>

// ✗ Wrong — PageTitle expects Heading as a slot element, not a plain string child
function BrokenRemoteHeader() {
  return (
    <div>
      <Page.Header.Title>Dashboard</Page.Header.Title> {/* Heading slot not filled */}
    </div>
  );
}
```

`asChild` is designed to make code-splitting easier, not to break slot contracts. A remote component filling a slot via `asChild` is responsible for knowing and satisfying the slot component's contract.

**Comparison of approaches:**

| Approach | Slot identity visible at callsite | Remote component is layout-agnostic | No changes to remote component |
|---|---|---|---|
| `headerSlot` prop | ✗ | ✓ | ✓ |
| Self-wrapping in slot | ✗ | ✗ | ✗ |
| **`asChild`** | **✓** | **✓** | **✓** |

---

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

### Reading Slot Props with `getSlotProps`

The inverse direction: the layout reads state the *consumer* controls through slot props, without owning it. A common case is consumer-controlled disclosure — the layout adapts its chrome to whether any slot is open:

```tsx
import { createComponentWithSlots, getSlotProps } from "@mikrostack/rst";

function FormSlot({ open, children }: { open: boolean; children?: ReactNode }) {
  return <div hidden={!open}>{children}</div>;
}

const Page = createComponentWithSlots({
  Title: {},
  Form: { component: FormSlot, multiple: true },
}).render(({ slots }) => {
  // Reactive: slot elements are re-collected every render, so the selector
  // always sees the consumer's current props.
  const isFormOpen = getSlotProps(slots.Form, (p) => p.open).some(Boolean);

  return (
    <header>
      {!isFormOpen && slots.Title}
      {slots.Form}
    </header>
  );
});

// Usage — the consumer keeps full control of the open state
<Page>
  <Page.Title>My page</Page.Title>
  <Page.Form open={isEditing}>…</Page.Form>
</Page>
```

### Typed Slot Context with `useSlotContext`

Slots that need to read or drive parent state — open/close flags, callbacks, orientation — can use `useSlotContext` instead of manually wiring a React context outside the slot system. The context shape is declared once in the config and is automatically typed at every call site.

```tsx
import { createComponentWithSlots, useSlotContext } from "@mikrostack/rst";

// Declare the context shape and defaults alongside the slot config
const Panel = createComponentWithSlots(
  {
    Header: {},
    Trigger: {},
    Body: {},
  },
  {
    context: {
      open: false,
      toggle: () => {},
    },
  },
).render(({ slots, provideContext }) => {
  const [open, setOpen] = useState(false);

  // Called on every render — RST pushes the value to the store after the commit
  provideContext({ open, toggle: () => setOpen(o => !o) });

  return (
    <div className="panel">
      <div className="panel-bar">
        {slots.Header}
        {slots.Trigger}
      </div>
      {open && <div className="panel-body">{slots.Body}</div>}
    </div>
  );
});

// Selector overload — re-renders only when `open` changes
function PanelStatusBadge() {
  const open = useSlotContext(Panel, s => s.open);
  return <span>{open ? "Open" : "Closed"}</span>;
}

// Full-shape overload — reads both `open` and `toggle`
function PanelToggleButton() {
  const { open, toggle } = useSlotContext(Panel);
  return <button onClick={toggle}>{open ? "Collapse" : "Expand"}</button>;
}

// Usage — both slot components are completely decoupled from Panel's internals
<Panel>
  <Panel.Header>
    Settings <PanelStatusBadge />
  </Panel.Header>
  <Panel.Trigger>
    <PanelToggleButton />
  </Panel.Trigger>
  <Panel.Body>
    <p>Content visible when open.</p>
  </Panel.Body>
</Panel>
```

**Key points:**
- The `context` option declares the shape and initial values. These are also the fallback values returned by `useSlotContext` when called outside a `<Panel>` instance.
- `provideContext` is called on every render with the current values. RST captures it during the render pass and pushes it to the store after the commit — `store.set` is never called during a React render.
- Each mounted instance of `Panel` has its own isolated store. Two `<Panel>` components on the same page do not share context.
- The selector form (`useSlotContext(Panel, s => s.open)`) re-renders the caller only when the selected value changes. Prefer it over the full-shape overload when only one or two values are needed.
- Passing a layout without a `context` option to `useSlotContext` is a compile-time error.

**`provideContext` and defaults:**

The `context` defaults should match the component's initial state. If `open: false` is the initial state, declare `open: false` as the default. This avoids a one-frame mismatch between the default store value and the first rendered state.

```tsx
// ✓ Defaults match initial useState values — no mismatch
createComponentWithSlots({ ... }, { context: { open: false, toggle: () => {} } })
.render(({ provideContext }) => {
  const [open, setOpen] = useState(false); // matches default
  provideContext({ open, toggle: () => setOpen(o => !o) });
  // ...
});
```

---

### Decoupled Context Modules with `createSlotContext`

`useSlotContext(Layout, …)` works when the consuming component is defined next to the layout. When a slot component lives in its own module, importing the layout back for the context handle creates an import cycle: the layout's slot config (`{ Header: { component: PanelHeader } }`) reads the component binding eagerly at module evaluation, while the component wants a reference to the layout. Cold loads survive because the context is only dereferenced at render time — but bundler HMR re-executes modules in an order that hits the half-initialized binding (`Cannot access 'PanelHeader' before initialization`), forcing full reloads or worse.

`createSlotContext` removes the reason for the back-import. The context is created in a leaf module both sides import:

```tsx
// panelContext.ts — leaf module, imports nothing from the layout
import { createSlotContext } from "@mikrostack/rst";

export const PanelContext = createSlotContext({
  open: false,
  toggle: () => {},
});
```

```tsx
// PanelHeader.tsx — imports the context, never the layout
import { useSlotContext } from "@mikrostack/rst";
import { PanelContext } from "./panelContext";

export function PanelHeader({ children }: PropsWithChildren) {
  const { open, toggle } = useSlotContext(PanelContext);
  return (
    <header>
      {children}
      <button onClick={toggle}>{open ? "Collapse" : "Expand"}</button>
    </header>
  );
}
```

```tsx
// Panel.tsx — provides the shared context
import { createComponentWithSlots } from "@mikrostack/rst";
import { PanelContext } from "./panelContext";
import { PanelHeader } from "./PanelHeader";

export const Panel = createComponentWithSlots(
  {
    Header: { component: PanelHeader },
    Body: {},
  },
  { context: PanelContext },
).render(({ slots, provideContext }) => {
  const [open, setOpen] = useState(false);
  provideContext({ open, toggle: () => setOpen(o => !o) });
  return (
    <div className="panel">
      {slots.Header}
      {open && <div className="panel-body">{slots.Body}</div>}
    </div>
  );
});
```

**Key points:**
- The dependency graph is acyclic: `Panel → PanelHeader → panelContext`. No module imports `Panel` from inside the slot tree.
- Everything else behaves exactly as with a plain defaults object: per-instance stores stay isolated, `provideContext` pushes after commit, and the declared defaults are the outside-provider fallback.
- Both handles read the same store — `useSlotContext(Panel, …)` still works for callers that already import the layout naturally.
- Layouts sharing one `SlotContext` share context *identity*: a consumer resolves the nearest providing instance, whichever layout it is. Reuse a context across layouts only when that is intended.

---

### Dot-path Slot Keys

When a slot config key contains dots (`"Header.Title"`), RST automatically generates a nested static accessor on the component (`Page.Header.Title`). The render function always uses the flat string form (`slots["Header.Title"]`).

```tsx
import { createComponentWithSlots } from "@mikrostack/rst";

const Page = createComponentWithSlots({
  "Header.Title": {},
  "Header.Actions": { multiple: true },
  Body: { isRequired: true },
}).render(({ slots }) => (
  <div>
    <header>
      {slots["Header.Title"]}
      <div>{slots["Header.Actions"]}</div>
    </header>
    <main>{slots.Body}</main>
  </div>
));

// Static accessors generated automatically:
// Page.Header.Title, Page.Header.Actions, Page.Body
<Page>
  <Page.Header.Title>My Page</Page.Header.Title>
  <Page.Header.Actions>Save</Page.Header.Actions>
  <Page.Header.Actions>Cancel</Page.Header.Actions>
  <Page.Body>…</Page.Body>
</Page>
```

Dot-path keys support arbitrary depth (`"A.B.C"` → `Component.A.B.C`). Plain keys and dot-path keys can be freely mixed in the same config. The dot notation is purely a namespacing convention for the static accessor — slot identity and collection remain the same as with plain keys.

---

### Reusable Slot Groups with `defineSlotGroup`

`defineSlotGroup` bundles a set of related slots with their render markup into a reusable unit, then lets multiple parent components share that unit without duplicating config or rendering code.

```tsx
import { createComponentWithSlots, defineSlotGroup } from "@mikrostack/rst";

const headerGroup = defineSlotGroup(
  "Header",
  { Title: {}, Actions: { multiple: true } },
  ({ slots }) => (
    <header>
      <h1>{slots["Header.Title"]}</h1>
      <div className="actions">{slots["Header.Actions"]}</div>
    </header>
  ),
);

// Spread the group config into one or more parent components
const Page = createComponentWithSlots({
  ...headerGroup.config(),
  Body: { isRequired: true },
}).render(({ slots }) => (
  <div>
    {headerGroup.render(slots)}
    <main>{slots.Body}</main>
  </div>
));

const Dialog = createComponentWithSlots({
  ...headerGroup.config(),
  Content: {},
  Footer: {},
}).render(({ slots }) => (
  <div className="dialog">
    {headerGroup.render(slots)}
    <div className="dialog__body">{slots.Content}</div>
    <footer>{slots.Footer}</footer>
  </div>
));

// Both components expose the same Header.* accessor surface
<Page>
  <Page.Header.Title>Dashboard</Page.Header.Title>
  <Page.Body>…</Page.Body>
</Page>

<Dialog>
  <Dialog.Header.Title>Confirm</Dialog.Header.Title>
  <Dialog.Content>Are you sure?</Dialog.Content>
</Dialog>
```

Multiple groups can be composed into the same parent as long as their prefixes differ:

```tsx
const footerGroup = defineSlotGroup("Footer", { Links: {}, Copyright: {} }, …);

const Layout = createComponentWithSlots({
  ...headerGroup.config(),
  ...footerGroup.config(),
}).render(({ slots }) => (
  <div>
    {headerGroup.render(slots)}
    <main>…</main>
    {footerGroup.render(slots)}
  </div>
));
```

---

### Checking Slot Content with `isSlotFilled`

Use `isSlotFilled` inside a render function to conditionally render wrapper elements around slots — avoiding empty containers when optional slots are unprovided.

```tsx
import { createComponentWithSlots, isSlotFilled } from "@mikrostack/rst";

const Article = createComponentWithSlots({
  "Header.Title": {},
  "Header.Action": { multiple: true },
  "Header.Form": {},
  "Body.Content": { isRequired: true },
}).render(({ slots }) => {
  // true if any Header.* slot has content
  const hasHeader = isSlotFilled(slots, "Header*");

  // true if Title or at least one Action is filled
  const hasTitleRow = isSlotFilled(slots, ["Header.Title", "Header.Action"]);

  return (
    <article>
      {hasHeader && (
        <header>
          {hasTitleRow && (
            <div className="title-row">
              {slots["Header.Title"]}
              {isSlotFilled(slots, "Header.Action") && (
                <div className="actions">{slots["Header.Action"]}</div>
              )}
            </div>
          )}
          {slots["Header.Form"]}
        </header>
      )}
      <div className="body">{slots["Body.Content"]}</div>
    </article>
  );
});
```

---

### Teleporting Content with Portal Slots

Regular slots are collected from the layout's **direct children** during its render. That makes them invisible across a render boundary: with React Router, a `<Layout>` whose body holds an `<Outlet />` never sees the routed component's elements as children — the routed component renders *below* the layout, in a separate subtree. A normal `<Layout.Header>` rendered inside that route would simply render inline, in the body, where it sits.

A **portal slot** (`{ portal: true }`) closes that gap. Any `<Layout.X>` element mounted anywhere beneath the layout registers its content into a small external store, and the layout renders that content at the slot's position. The call-site syntax is identical to a regular slot — the `portal` flag is the only difference.

```tsx
import { createComponentWithSlots } from "@mikrostack/rst";
import { Outlet } from "react-router-dom";

const Layout = createComponentWithSlots({
  Header: { portal: true },  // filled from across the Outlet boundary
  Body: {},
}).render(({ slots }) => (
  <div className="layout">
    <header>{slots.Header}</header>
    <main>{slots.Body}</main>
  </div>
));

// Mount once; the Body holds the router Outlet
<Layout>
  <Layout.Body>
    <Outlet />
  </Layout.Body>
</Layout>

// A routed component, rendered deep inside the Outlet, fills the Header
function ProductsPage() {
  const { data } = useProducts(); // its own state / queries
  return (
    <>
      <Layout.Header>
        <h1>Products ({data?.length ?? 0})</h1>
      </Layout.Header>
      <ProductGrid items={data} />
    </>
  );
}
```

`ProductsPage` teleports its `<h1>` up into the layout's `<header>`, even though it renders below the layout in a different subtree. When the route changes, the old header unregisters and the new route's header takes its place.

**Single vs. multiple:**
- A single-value portal slot shows the **last** registrant to mount. A deeper component (e.g. a routed page) therefore overrides a shallower one.
- A `{ portal: true, multiple: true }` slot renders **every** registrant — useful for action bars where several descendants contribute buttons.

**Call-site default, route override:**

Because a `<Layout.X>` provided at the layout's own call site mounts before the body, it acts as a **default** that content rendered deeper (such as a route) overrides. When that deeper registrant unmounts, the slot reverts to the default.

```tsx
<Layout>
  <Layout.Header>
    <DefaultHeader />   {/* shown until a route provides its own */}
  </Layout.Header>
  <Layout.Body>
    <Outlet />
  </Layout.Body>
</Layout>
```

**Presence-aware chrome with `portal(name, render)`:**

The render function receives a `portal` helper for the case where the layout needs to react to *whether* a slot is filled — e.g. to omit the surrounding `<header>` element entirely when no route contributes one. `portal(name, render)` returns a leaf that subscribes to the slot and calls `render` with its resolved content (`null` when empty):

```tsx
const Layout = createComponentWithSlots({
  Header: { portal: true },
  Body: {},
}).render(({ slots, portal }) => (
  <div className="layout">
    {portal("Header", (content) =>
      content ? <header className="chrome">{content}</header> : null
    )}
    <main>
      <HeavyVideoPlayer />   {/* never re-renders on header changes */}
      {slots.Body}
    </main>
  </div>
));
```

The subscription lives entirely inside that leaf, so a header fill/unfill re-renders **only** the boundary — never the layout body or its siblings. Heavy, stateful content (videos, canvases, anything holding a ref) stays referentially stable without needing `React.memo`. `portal` is typed to accept only slot names declared with `{ portal: true }`.

> Prefer `portal(name, render)` when you need presence-driven chrome; use plain `{slots.Header}` when the surrounding markup is always present. They share a single subscription per slot — don't nest `{slots.Header}` inside a `portal()` callback; use the `content` argument the callback already gives you.

**Semantics and caveats:**
- Portal content registers in a layout effect after commit, so it appears one frame after the registrant mounts — usually imperceptible. For content that must be present on first paint (e.g. SSR), use React Router's `handle` + `useMatches` instead, which is static route config rather than live content.
- Registration is effect-based and therefore client-only; portal slots are empty during server rendering until hydration.
- `isRequired` is not enforced on portal slots — their content arrives after render, so it can't be validated synchronously.
- Each mounted layout instance has its own isolated portal stores; nested or sibling layouts never bleed into each other.
- A portal element rendered with no matching layout above it logs an error in development and renders nothing.

**When *not* to reach for it:** if the header only varies by route and needs no live data, React Router's `handle` + `useMatches` is simpler and SSR-safe. Portal slots earn their keep when the teleported content depends on the routed component's own state, data, or effects.

---

## TypeScript Support

The system provides full TypeScript support with excellent type inference:

- Slot configuration is inferred from the `slotsConfig` argument
- Component props are explicitly specified via `render<T>()`
- Slot availability is enforced in the render function
- Multiple slots are correctly typed as arrays
- Required slots are enforced
- Each `slots.X` is typed to `ReactElement<ComponentProps>` based on the slot's `component` — not `ReactElement<any>`. This includes `multiple` slots, which are typed `ReactElement<ComponentProps>[]`, so element props are readable (see `getSlotProps`)
- Portal slots are typed `ReactNode` regardless of `multiple` — their position renders a single live boundary element; the registered content lives in a store, not in collected elements
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
  // - Body:    ReactNode            (no component configured)
  // - Actions: ReactNode[]          (multiple: true, no component configured)
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

1. **Use default wrappers for simple slots**: Omit `component` when the slot needs no custom structure — the content renders without a wrapper element
2. **Provide custom components only when needed**: Only specify `component` when you need custom styling, logic, or structure
3. **Use meaningful slot names**: Names should reflect their purpose (Header, Body, Footer, etc.)
4. **Consider required slots**: Mark slots as required when they're essential for functionality
5. **Provide sensible defaults**: Use default content for optional slots with common patterns
6. **Handle non-slot children appropriately**: Have a plan for how to deal with non-slot children
7. **Use `withProps` for static prop binding**: Prefer `withProps` over `injectSlotProps` when the bound values never change — it keeps the render function clean and makes the contract explicit at the config level
8. **Use `injectSlotProps` for runtime props**: Use it when a slot component needs render-time data (a specific callback, an open flag) but only a single slot needs it — simpler than a full context
9. **Use `useSlotContext` when multiple slots share state**: If two or more slot components need to read or drive the same parent state, declare it in `context` rather than threading props through `injectSlotProps` on each slot individually. Use the selector overload to keep re-renders granular.
10. **Reach for portal slots only across render boundaries**: Use `{ portal: true }` when content must fill a slot from outside the layout's direct children — typically a React Router `<Outlet />`. For same-tree composition, a regular slot is simpler. When the header only depends on the route (not live data), prefer `handle` + `useMatches`.

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
