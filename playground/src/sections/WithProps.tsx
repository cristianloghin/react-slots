// ─── withProps demo ───────────────────────────────────────────────────────────

import { createComponentWithSlots, withProps } from "@mikrostack/rst";

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

export function WithProps() {
  return (
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
  );
}
