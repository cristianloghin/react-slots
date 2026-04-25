import { createComponentWithSlots, withProps } from "@mikrostack/rst";
import "./styles.css";

// --- Shared slot component used by two slots ---

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

// withProps binds `side` at definition time — no injectSlotProps needed in render
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

// --- Basic card ---

const Card = createComponentWithSlots({
  Header: {},
  Body: { isRequired: true },
  Footer: { defaultContent: <em>No footer provided</em> },
  Tag: { multiple: true },
}).render(({ slots }) => (
  <div className="card">
    {slots.Header && <div className="card__header">{slots.Header}</div>}
    <div className="card__body">{slots.Body}</div>
    {slots.Tag.length > 0 && (
      <div className="card__tags">{slots.Tag}</div>
    )}
    <div className="card__footer">{slots.Footer}</div>
  </div>
));

const Badge = ({ label, color = "#eee" }: { label: string; color?: string }) => (
  <span className="badge" style={{ background: color }}>
    {label}
  </span>
);

export default function App() {
  return (
    <div className="app">
      <h2>RST Playground</h2>

      <section>
        <h3>withProps — static prop binding</h3>
        <p className="hint">
          Both sidebars use the same <code>Sidebar</code> component.{" "}
          <code>withProps</code> binds <code>side</code> at definition time.
        </p>
        <Layout>
          <Layout.Left>Nav links</Layout.Left>
          <Layout.Body>Main content</Layout.Body>
          <Layout.Right>Related items</Layout.Right>
        </Layout>
      </section>

      <section>
        <h3>Card — basic slots</h3>
        <Card>
          <Card.Header>My Card Title</Card.Header>
          <Card.Body>This is the card body content.</Card.Body>
          <Card.Tag><Badge label="react" color="#61dafb33" /></Card.Tag>
          <Card.Tag><Badge label="slots" color="#a78bfa33" /></Card.Tag>
          <Card.Footer>Updated just now</Card.Footer>
        </Card>

        <Card>
          <Card.Body>Card with default footer and no header.</Card.Body>
        </Card>
      </section>
    </div>
  );
}
