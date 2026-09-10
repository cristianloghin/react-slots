# React Slot Component System

A small library for building layouts with named slots in React. A layout declares its slots once, gets a typed fill component for each (`Page.Header.Title`), collects the fills from its children, and arranges them however it likes.

```tsx
import { createLayout, slot } from "@mikrostack/rst";

const Card = createLayout(
  { Header: slot(), Body: slot({ required: true }), Footer: slot() },
  ({ className }: { className?: string }, { slots }) => (
    <div className={className}>
      {slots.Header.when((h) => h && <header>{h}</header>)}
      {slots.Body}
      {slots.Footer}
    </div>
  ),
);

<Card className="my-card">
  <Card.Header>Card Title</Card.Header>
  <Card.Body>Card content</Card.Body>
  <Card.Footer><Button>Action</Button></Card.Footer>
</Card>
```

## Table of Contents

- [Installation](#installation)
- [Concepts](#concepts)
- [API Reference](#api-reference)
  - [`createLayout`](#createlayoutconfig-options-render)
  - [`slot`](#slotoptions)
  - [Slot handles](#slot-handles)
  - [`createSlotContext` / `useSlotContext`](#createslotcontextdefaults--useslotcontextcontext-selector)
- [Guide](#guide)
  - [Slot options](#slot-options)
  - [Groups](#groups)
  - [Nested layouts](#nested-layouts)
  - [Fills in other files](#fills-in-other-files)
  - [`asChild`](#aschild)
  - [Props from the layout](#props-from-the-layout)
  - [Reading fill props](#reading-fill-props)
  - [Presence](#presence)
  - [Non-slot children](#non-slot-children)
  - [Shared state with a slot context](#shared-state-with-a-slot-context)
  - [Portal slots](#portal-slots)
  - [Refs](#refs)
- [TypeScript](#typescript)
- [Migration from 0.x](#migration-from-0x)

## Installation

```bash
npm install @mikrostack/rst
```

Peer dependencies: `react` and `react-dom` 18 or 19.

## Concepts

- **Layout.** A component created with `createLayout`. It owns a slot config and a render function that arranges the slots.
- **Slot.** One named position in a layout, declared with `slot()`. Slots can be nested in plain objects to form **groups**.
- **Fill.** The component a consumer renders to put content into a slot: `<Card.Header>…</Card.Header>`. Every slot in the config becomes a fill on the layout, at the same path.
- **Handle.** What the render function sees for each slot, under `slots`, at the same path again. A handle renders directly (`{slots.Header}`) and also exposes the collected fill: `filled`, `props`, `render(extra)`, `when(fn)`.

The config, the fills, and the handles share one shape. If the config says `Header: { Title: slot() }`, the consumer writes `<Page.Header.Title>` and the layout reads `slots.Header.Title`.

## API Reference

### `createLayout(config, [options], render)`

```ts
createLayout(config, render)
createLayout(config, { context }, render)
```

- **`config`** — an object whose values are `slot()` definitions or nested objects of them (groups).
- **`options.context`** — a context from `createSlotContext`. The render function then receives `provide`.
- **`render(props, api)`** — arranges the slots.
  - `props` — the layout's own props. Annotate the parameter to type them; the layout's public props type is inferred from that annotation. Declare `ref?: Ref<E>` there to receive the call-site ref as `props.ref` (see [Refs](#refs)).
  - `api.slots` — the slot handles, mirroring the config's shape.
  - `api.children` — children that are not fills, in order.
  - `api.provide(value)` — only with `options.context`. Publishes the context value for this instance.

Returns a `forwardRef` component with the fills attached as static properties.

### `slot(options?)`

| Option | Type | Description |
|---|---|---|
| `component` | component | Wraps every fill. Its static properties become nested fills, so a layout used as a component exposes its own slots: `Page.Header.Title`. |
| `props` | partial props of `component` | Bound at definition time. A fill may still override them. |
| `required` | boolean | Log a development error when the slot is unfilled. |
| `multiple` | boolean | Collect every fill, in order, instead of only the last one. |
| `fallback` | node | Rendered in the slot's place when it is unfilled. Does not count as filled. |
| `portal` | boolean | Fill from anywhere beneath the layout, across render boundaries. See [Portal slots](#portal-slots). |

Every fill accepts `asChild` and, as `children`, either nodes or a function of the fill itself (see [Fills in other files](#fills-in-other-files)).

### Slot handles

Each entry in `api.slots` is one of:

**Single slot** (the default)

| Member | Description |
|---|---|
| render directly | `{slots.X}` renders the fill, or the fallback. |
| `filled` | `true` when a fill was collected. |
| `element` | The collected element, or `null`. |
| `props` | The collected element's props, or `undefined`. |
| `render(extra)` | Renders the fill with `extra` merged into its props. |
| `when(fn)` | Calls `fn` with the content, or `null` when unfilled, and renders the result. |

**Multiple slot** (`multiple: true`)

Same as above with `elements` (an array) and `props` (an array of props). `render(extra)` merges into every element.

**Portal slot** (`portal: true`)

Renders directly and supports `when(fn)`. Its content arrives after commit, so `filled`, `element` and `props` are not available; `when` is how the layout reacts to presence.

**Group** (a nested object in the config)

Has one handle per member, plus `filled` (true when any member is filled) and `when(fn)`. Rendering a group directly emits every member in config order.

`filled` and `when` are reserved and cannot be used as slot names.

### `createSlotContext(defaults)` / `useSlotContext(context, [selector])`

```ts
const PanelContext = createSlotContext({ open: false, toggle: () => {} });

const open = useSlotContext(PanelContext, (s) => s.open); // re-renders only when `open` changes
const all = useSlotContext(PanelContext);                 // re-renders on any change
```

A slot context is a typed value that each layout instance declaring it provides to everything beneath it. `defaults` is what consumers read outside any such instance. See [Shared state](#shared-state-with-a-slot-context).

## Guide

### Slot options

```tsx
const Card = createLayout(
  {
    Header: slot(),
    Body: slot({ required: true }),
    Footer: slot({ fallback: <em>No footer</em> }),
    Tag: slot({ multiple: true }),
    Title: slot({ component: Heading, props: { level: 2 } }),
  },
  (_, { slots }) => (
    <div>
      {slots.Header}
      {slots.Title}
      {slots.Body}
      {slots.Tag.when((tags) => tags && <div className="tags">{tags}</div>)}
      {slots.Footer}
    </div>
  ),
);

<Card>
  <Card.Title>Rendered by Heading with level 2</Card.Title>
  <Card.Body>…</Card.Body>
  <Card.Tag>one</Card.Tag>
  <Card.Tag>two</Card.Tag>
</Card>
```

- Fills of a `multiple` slot get index keys automatically when they have none.
- A single slot that receives more than one fill keeps the last one and warns in development.
- Two slots may share the same `component`; identity is per slot, not per component.
- A slot without `component` renders its children bare, with no wrapper element.

### Groups

Nest plain objects in the config to namespace slots. The fills and the handles nest the same way.

```tsx
const Page = createLayout(
  {
    Header: { Title: slot(), Actions: slot({ multiple: true }) },
    Body: slot({ required: true }),
  },
  (_, { slots }) => (
    <div>
      {slots.Header.when((h) => h && <header>{h}</header>)}
      <main>{slots.Body}</main>
    </div>
  ),
);

<Page>
  <Page.Header.Title>Dashboard</Page.Header.Title>
  <Page.Header.Actions>Save</Page.Header.Actions>
  <Page.Body>…</Page.Body>
</Page>
```

A group is an ordinary object, so a set of slots can be defined once and used by several layouts:

```tsx
const headerSlots = { Title: slot(), Actions: slot({ multiple: true }) };

const Page = createLayout({ Header: headerSlots, Body: slot() }, …);
const Dialog = createLayout({ Header: headerSlots, Content: slot() }, …);
```

Each layout gets its own slot identities, so `Page.Header.Title` and `Dialog.Header.Title` are distinct fills.

### Nested layouts

A slot whose `component` is itself a layout exposes that layout's fills on its own fill, so consumers address the whole tree from the outer layout:

```tsx
const Header = createLayout(
  { Title: slot(), Actions: slot({ multiple: true }) },
  (_, { slots }) => <header>{slots.Title}<div>{slots.Actions}</div></header>,
);

const Page = createLayout(
  { Header: slot({ component: Header }), Body: slot() },
  (_, { slots }) => <div>{slots.Header}{slots.Body}</div>,
);

<Page>
  <Page.Header>
    <Page.Header.Title>My Page</Page.Header.Title>
    <Page.Header.Actions><button>Save</button></Page.Header.Actions>
  </Page.Header>
  <Page.Body>Content</Page.Body>
</Page>
```

A fill rendered outside its layout renders its component standalone, so `<Page.Header.Title>` also works on its own.

### Fills in other files

A layout collects fills from its direct children. If the content of a slot lives in another file, wrapping it in a component would put the nested fills one level too deep to be collected. Instead, pass a **function** as the fill's children. It receives the fill itself, runs during the fill's render (hooks allowed), and its result is collected by the slot's component as usual.

```tsx
// productHeader.tsx — never imports Page
export function productHeader(h: typeof Page.Header, product: Product) {
  const [query, setQuery] = useState("");
  return (
    <>
      <h.Title>{product.name}</h.Title>
      <h.Form><input value={query} onChange={(e) => setQuery(e.target.value)} /></h.Form>
    </>
  );
}

// Route
<Page>
  <Page.Header>{(h) => productHeader(h, product)}</Page.Header>
  <Page.Body>…</Page.Body>
</Page>
```

The function must return the fills themselves (a fragment is fine), not a component that renders them. A returned component is treated as a plain, non-slot child.

### `asChild`

`asChild` replaces the slot's component with the fill's single child. Use it when a remote component owns the whole markup for a slot and the slot's chrome should not apply.

```tsx
<Page.Header asChild>
  <RemoteHeader />   {/* rendered at the Header position; Page's Header component is bypassed */}
</Page.Header>
```

- The child must be exactly one React element.
- `required`, `multiple` and `fallback` still apply to the slot position.
- `asChild` cannot be combined with a function child.

### Props from the layout

**At definition time**, bind props on the slot:

```tsx
Left: slot({ component: Sidebar, props: { side: "left" } }),
Right: slot({ component: Sidebar, props: { side: "right" } }),
```

Bound props are optional at the call site and can be overridden: `<Layout.Left side="right">`.

**At render time**, merge props into the collected fill:

```tsx
(_, { slots }) => <div>{slots.Title.render({ level: 2, onClose })}</div>
```

`render(extra)` is typed from the slot's component, so a wrong prop is a compile error. It clones the collected element; with `asChild`, the element is the child and its props may differ from the component's.

### Reading fill props

```tsx
const Form = createLayout(
  { Field: slot({ component: Field, multiple: true }) },
  (_, { slots }) => {
    const anyRequired = slots.Field.props.some((p) => p.required);
    return <form data-required={anyRequired}>{slots.Field}</form>;
  },
);
```

`props` is the collected element's props (single) or an array of them (multiple). It reads committed props during render, so it is always current with no subscription.

### Presence

Use `when` to render chrome only when there is content, on a slot or on a whole group:

```tsx
(_, { slots }) => (
  <article>
    {slots.Header.when((h) => h && <header>{h}</header>)}
    {slots.Aside.when((a) => a && <aside>{a}</aside>)}
    {slots.Body}
  </article>
)
```

`filled` is the boolean form. A fallback does not count as filled.

### Non-slot children

Anything passed to a layout that is not a fill is handed to the render function as `children`, in order, including text. Place it where you want:

```tsx
(_, { slots, children }) => (
  <div>
    {slots.Header}
    <main>{children}</main>
  </div>
)
```

### Shared state with a slot context

When several fills need to read or drive the same layout state, declare a slot context. It lives in its own module, so fills import the context rather than the layout, which keeps the module graph free of cycles.

```tsx
// panelContext.ts
export const PanelContext = createSlotContext({ open: false, toggle: () => {} });

// Panel.tsx
export const Panel = createLayout(
  { Header: slot(), Body: slot() },
  { context: PanelContext },
  (_, { slots, provide }) => {
    const [open, setOpen] = useState(false);
    provide({ open, toggle: () => setOpen((o) => !o) }); // every render
    return <div>{slots.Header}{open && slots.Body}</div>;
  },
);

// PanelToggle.tsx — imports the context, not the layout
export function PanelToggle() {
  const { open, toggle } = useSlotContext(PanelContext);
  return <button onClick={toggle}>{open ? "Collapse" : "Expand"}</button>;
}
```

- Each mounted layout instance has its own store. Two `<Panel>`s do not share state.
- `provide` captures the value during render; the layout pushes it to the store after commit.
- Match the defaults to the layout's initial state to avoid a one-frame mismatch.
- The selector overload re-renders the consumer only when the selected value changes.
- A nested layout providing the same context shadows the outer one.

### Portal slots

Regular slots are collected from the layout's direct children, so they cannot be filled from across a render boundary such as a React Router `<Outlet />`. A portal slot can: any `<Layout.X>` mounted anywhere beneath the layout registers its content, and the layout renders it at the slot's position. The call-site syntax is the same.

```tsx
const Shell = createLayout(
  { Header: slot({ portal: true }), Body: slot() },
  (_, { slots }) => (
    <div>
      {slots.Header.when((h) => h && <header>{h}</header>)}
      <main>{slots.Body}</main>
    </div>
  ),
);

<Shell>
  <Shell.Header>Default title</Shell.Header>   {/* shown until a route provides one */}
  <Shell.Body><Outlet /></Shell.Body>
</Shell>

function ProductsPage() {
  const { data } = useProducts();
  return (
    <>
      <Shell.Header><h1>Products ({data?.length ?? 0})</h1></Shell.Header>
      <ProductGrid items={data} />
    </>
  );
}
```

- A single portal slot shows the **last** registrant to mount, so a routed page overrides a call-site default and the default returns when the page unmounts. A `multiple` portal slot shows every registrant.
- Only the leaf rendered by `{slots.Header}` or `when` subscribes to the slot. The layout body and its siblings never re-render on fill or unfill.
- Registration happens in a layout effect, so content is absent during server rendering and appears right after mount. `required` is not enforced on portal slots.
- Each layout instance has its own stores. A portal fill with no layout above it logs a development error and renders nothing.
- Function children work on portal fills too.

Reach for portal slots only across render boundaries. For same-tree composition, a regular slot is simpler and SSR-safe.

### Refs

Declare `ref` in the props type. The call-site ref arrives as `props.ref`, and the layout decides where it lands:

```tsx
const Scroller = createLayout(
  { Body: slot() },
  ({ ref, className }: { className?: string; ref?: Ref<HTMLDivElement> }, { slots }) => (
    <div ref={ref} className={className}>{slots.Body}</div>
  ),
);

const scrollRef = useRef<HTMLDivElement>(null);
<Scroller ref={scrollRef}>…</Scroller>
```

The layout's external `ref` type is derived from that declaration. Without a call-site ref, `props.ref` is `null`.

Fills forward refs to the slot's `component`, including portal slots, where the ref lands on the teleported node. A slot without a component has nothing to attach a ref to, and `asChild` dissolves the wrapper, so put the ref on the child itself in those cases. Works the same on React 18 and 19.

## TypeScript

- The slot config is inferred from the object passed to `createLayout`, including `component` types and bound `props`.
- The layout's props are inferred from the `props` parameter annotation. Without one, the layout accepts only `children` and `ref`.
- Fill props come from the slot's `component`; bound props become optional. A group is not a component, so `<Page.Header />` on a group is a compile error.
- Handles are typed per slot: `props`, `element`/`elements`, and `render(extra)` know the component's props. Portal handles expose only `when`.
- A function child is typed as `(fill: typeof Page.Header) => ReactNode`, so annotate helper functions with `typeof Layout.Slot`.
- `useSlotContext` is typed from the context, with or without a selector.

## Migration from 0.x

The 0.x API (`createComponentWithSlots(config).render<T, E>(fn)`) is replaced by `createLayout`. Call sites that fill slots are unchanged except where noted.

| 0.x | Now |
|---|---|
| `createComponentWithSlots(config).render<T, E>(({ slots, className }) => …)` | `createLayout(config, ({ className }: T, { slots }) => …)` |
| `Header: {}` | `Header: slot()` |
| `Header: { component: X, isRequired: true, defaultContent: … }` | `Header: slot({ component: X, required: true, fallback: … })` |
| `"Header.Title": {}` and `slots["Header.Title"]` | `Header: { Title: slot() }` and `slots.Header.Title` |
| `defineSlotGroup` / `prefixSlots` | A plain object of slots, nested under a key |
| `withProps(X, bound)` | `slot({ component: X, props: bound })` |
| `injectSlotProps(slots.X, extra)` | `slots.X.render(extra)` |
| `getSlotProps(slots.X, p => p.a)` | `slots.X.props` (single) / `slots.X.props.map(p => p.a)` (multiple) |
| `isSlotFilled(slots, "Header*")` | `slots.Header.filled` |
| `isSlotFilled(slots, "Header.Title")` | `slots.Header.Title.filled` |
| `portal("Header", fn)` | `slots.Header.when(fn)` |
| `nonSlotChildren` | `children` (second argument), now including text |
| `{ context: { open: false } }` + `useSlotContext(Layout)` | `createSlotContext({ open: false })` + `useSlotContext(context)` |
| `provideContext(value)` | `provide(value)` |
| `render<T, HTMLDivElement>` for the ref type | `ref?: Ref<HTMLDivElement>` in the props annotation; read `props.ref` |
| `asChild` for a header written in another file | A function child: `<Page.Header>{(h) => productHeader(h, data)}</Page.Header>` |

Behaviour changes to be aware of:

- `slots.X` is a handle, not a bare element. It renders the same, but code that spread a slot into props or passed it to `cloneElement` should use `slots.X.element` or `slots.X.render(extra)`.
- A `fallback` no longer counts as filled; `filled` is false and the required check still fires.
- Fragments among a layout's children are looked through during collection.
- `filled` and `when` are reserved slot names.
- `useSlotContext(Layout)` is gone; only contexts from `createSlotContext` can be provided and read.
