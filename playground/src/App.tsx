import {
  createComponentWithSlots,
  useSlotContext,
  withProps,
} from "@mikrostack/rst";
import { useState } from "react";
import "./styles.css";

// ─── PageTitle — slotted component used as PageHeader's Title slot component ──

const PageTitle = createComponentWithSlots({
  Icon: {},
  Heading: { isRequired: true },
}).render(({ slots }) => (
  <div className="page-title">
    {slots.Icon && <div className="page-title__icon">{slots.Icon}</div>}
    <div className="page-title__heading">{slots.Heading}</div>
  </div>
));

// ─── PageHeader — slotted component used as Page's Header slot component ──────

const PageHeader = createComponentWithSlots({
  Title: { component: PageTitle, isRequired: true },
  Form: {},
}).render(({ slots }) => (
  <div className="page-header">
    <div className="page-header__title">{slots.Title}</div>
    {slots.Form && <div className="page-header__form">{slots.Form}</div>}
  </div>
));

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = createComponentWithSlots({
  Header: { component: PageHeader },
  Body: { isRequired: true },
}).render(({ slots }) => (
  <div className="page">
    <div className="page__header">{slots.Header}</div>
    <div className="page__body">{slots.Body}</div>
  </div>
));

// ─── Remote components ────────────────────────────────────────────────────────

// Fills Page.Header.Title via asChild — bypasses PageTitle, owns its own layout
function RemoteTitle({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="remote-title">
      <span className="remote-title__icon">★</span>
      {editing ? (
        <input
          className="remote-title__input"
          defaultValue={name}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <span className="remote-title__text" onClick={() => setEditing(true)}>
          {name} <em className="remote-title__hint">(click to edit)</em>
        </span>
      )}
    </div>
  );
}

// Fills Page.Header via asChild — bypasses PageHeader, owns its own layout
function RemoteHeader({ title }: { title: string }) {
  const [query, setQuery] = useState("");
  return (
    <div className="remote-page-header">
      <Page.Header.Title>
        <Page.Header.Title.Heading>{title}</Page.Header.Title.Heading>
      </Page.Header.Title>
      <Page.Header.Form>
        <input
          className="remote-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Remote search…"
        />
      </Page.Header.Form>
    </div>
  );
}

// ─── withProps demo ───────────────────────────────────────────────────────────

function Sidebar({
  side,
  children,
}: {
  side: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <aside className={`sidebar sidebar--${side}`}>
      <strong>{side === "left" ? "Left" : "Right"}</strong>
      {children}
    </aside>
  );
}

const Layout = createComponentWithSlots({
  Left: { component: withProps(Sidebar, { side: "left" }) },
  Right: { component: withProps(Sidebar, { side: "right" }) },
  Body: { isRequired: true },
}).render(({ slots }) => (
  <div className="layout">
    {slots.Left}
    <main className="layout__body">{slots.Body}</main>
    {slots.Right}
  </div>
));

// ─── TagList — multiple slot instances ───────────────────────────────────────

const TagList = createComponentWithSlots({
  Tag: { multiple: true },
}).render(({ slots }) => <div className="tag-list">{slots.Tag}</div>);

// ─── Basic card ───────────────────────────────────────────────────────────────

const Card = createComponentWithSlots({
  Header: {},
  Body: { isRequired: true },
  Footer: { defaultContent: <em>No footer provided</em> },
  Tag: { multiple: true },
}).render(({ slots }) => (
  <div className="card">
    {slots.Header && <div className="card__header">{slots.Header}</div>}
    <div className="card__body">{slots.Body}</div>
    {slots.Tag.length > 0 && <div className="card__tags">{slots.Tag}</div>}
    <div className="card__footer">{slots.Footer}</div>
  </div>
));

const Badge = ({
  label,
  color = "#eee",
}: {
  label: string;
  color?: string;
}) => (
  <span className="badge" style={{ background: color }}>
    {label}
  </span>
);

// ─── Slot context demo ───────────────────────────────────────────────────────

const Panel = createComponentWithSlots(
  {
    Header: {},
    Trigger: {},
    Body: { isRequired: true },
  },
  {
    context: {
      open: false,
      toggle: () => {},
    },
  },
).render(({ slots, provideContext }) => {
  const [open, setOpen] = useState(false);
  provideContext({ open, toggle: () => setOpen((o) => !o) });
  return (
    <div className="panel">
      <div className="panel__bar">
        <div className="panel__header">{slots.Header}</div>
        <div className="panel__trigger">{slots.Trigger}</div>
      </div>
      {open && <div className="panel__body">{slots.Body}</div>}
    </div>
  );
});

// Reads `open` via selector — re-renders only when open changes
function PanelStatusBadge() {
  const open = useSlotContext(Panel, (s) => s.open);
  return (
    <span
      className={`panel-badge ${open ? "panel-badge--open" : "panel-badge--closed"}`}
    >
      {open ? "open" : "closed"}
    </span>
  );
}

// Reads both `open` and `toggle` via full-shape overload
function PanelToggleButton() {
  const { open, toggle } = useSlotContext(Panel);
  return (
    <button className="panel-btn" onClick={toggle}>
      {open ? "▲ Collapse" : "▼ Expand"}
    </button>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="app">
      <h2>RST Playground</h2>

      {/* ── Normal: all three levels collect their sub-slots ────────────────── */}
      <section>
        <h3>Normal — three levels of slot collection</h3>
        <p className="hint">
          <code>PageHeader</code> collects <code>Title</code> and{" "}
          <code>Form</code>. <code>PageTitle</code> collects <code>Icon</code>{" "}
          and <code>Heading</code>.
        </p>
        <Page>
          <Page.Header>
            <Page.Header.Title>
              <Page.Header.Title.Icon>⚡</Page.Header.Title.Icon>
              <Page.Header.Title.Heading>
                My Dashboard
              </Page.Header.Title.Heading>
            </Page.Header.Title>
            <Page.Header.Form>
              <input className="search-input" placeholder="Search…" />
            </Page.Header.Form>
          </Page.Header>
          <Page.Body>Page body content.</Page.Body>
        </Page>
      </section>

      {/* ── asChild on Page.Header.Title — bypasses PageTitle ───────────────── */}
      <section>
        <h3>
          asChild on <code>Page.Header.Title</code> — bypasses PageTitle
        </h3>
        <p className="hint">
          <code>RemoteTitle</code> fills the <code>Title</code> slot via{" "}
          <code>asChild</code>. <code>PageTitle</code> is bypassed.{" "}
          <code>PageHeader</code> still collects <code>Title</code> normally and
          applies its layout.
        </p>
        <Page>
          <Page.Header>
            <Page.Header.Title asChild>
              <RemoteTitle name="My Dashboard" />
            </Page.Header.Title>
            <Page.Header.Form>
              <input className="search-input" placeholder="Search…" />
            </Page.Header.Form>
          </Page.Header>
          <Page.Body>Page body content.</Page.Body>
        </Page>
      </section>

      {/* ── asChild on Page.Header — bypasses PageHeader ────────────────────── */}
      <section>
        <h3>
          asChild on <code>Page.Header</code> — bypasses PageHeader
        </h3>
        <p className="hint">
          <code>RemoteHeader</code> fills the <code>Header</code> slot via{" "}
          <code>asChild</code>. <code>PageHeader</code> is bypassed —{" "}
          <code>RemoteHeader</code> controls the layout.
        </p>
        <Page>
          <Page.Header asChild>
            <RemoteHeader title="Remote Dashboard" />
          </Page.Header>
          <Page.Body>Page body content.</Page.Body>
        </Page>
      </section>

      {/* ── withProps ─────────────────────────────────────────────────────────── */}
      <section>
        <h3>withProps — static prop binding</h3>
        <p className="hint">
          Both sidebars share the same <code>Sidebar</code> component.{" "}
          <code>withProps</code> binds <code>side</code> at definition time.
        </p>
        <Layout>
          <Layout.Left>Nav links</Layout.Left>
          <Layout.Body>Main content</Layout.Body>
          <Layout.Right>Related items</Layout.Right>
        </Layout>
      </section>

      {/* ── TagList — multiple slot instances, no keys needed ───────────────── */}
      <section>
        <h3>TagList — multiple slot instances</h3>
        <p className="hint">
          No <code>key</code> props on the children — RST assigns index-based
          keys automatically. Open the console to confirm no key warnings.
        </p>
        <TagList>
          <TagList.Tag>
            <Badge label="react" color="#61dafb33" />
          </TagList.Tag>
          <TagList.Tag>
            <Badge label="typescript" color="#3178c633" />
          </TagList.Tag>
          <TagList.Tag>
            <Badge label="slots" color="#a78bfa33" />
          </TagList.Tag>
          <TagList.Tag>
            <Badge label="no keys needed" color="#fde68a33" />
          </TagList.Tag>
        </TagList>
      </section>

      {/* ── Basic card ──────────────────────────────────────────────────────── */}
      <section>
        <h3>Card — basic slots</h3>
        <Card>
          <Card.Header>My Card Title</Card.Header>
          <Card.Body>This is the card body content.</Card.Body>
          <Card.Tag>
            <Badge label="react" color="#61dafb33" />
          </Card.Tag>
          <Card.Tag>
            <Badge label="slots" color="#a78bfa33" />
          </Card.Tag>
          <Card.Footer>Updated just now</Card.Footer>
        </Card>
        <Card>
          <Card.Body>Card with default footer and no header.</Card.Body>
        </Card>
      </section>

      {/* ── useSlotContext ───────────────────────────────────────────────────── */}
      <section>
        <h3>useSlotContext — typed slot context</h3>
        <p className="hint">
          <code>PanelStatusBadge</code> uses the selector overload and
          re-renders only when <code>open</code> changes.{" "}
          <code>PanelToggleButton</code> uses the full-shape overload to read
          both <code>open</code> and <code>toggle</code>. Neither component
          knows anything about <code>Panel</code>'s internals.
        </p>
        <Panel>
          <Panel.Header>
            Settings <PanelStatusBadge />
          </Panel.Header>
          <Panel.Trigger>
            <PanelToggleButton />
          </Panel.Trigger>
          <Panel.Body>
            <p>This content is only visible when the panel is open.</p>
          </Panel.Body>
        </Panel>
      </section>
    </div>
  );
}
