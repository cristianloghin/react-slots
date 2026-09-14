// ─── Bound props demo ─────────────────────────────────────────────────────────

import { createLayout, slot } from "@mikrostack/rst";

function Sidebar({ side, children }: { side: "left" | "right"; children?: React.ReactNode }) {
  return (
    <aside className={`sidebar sidebar--${side}`}>
      <strong>{side === "left" ? "Left" : "Right"}</strong>
      {children}
    </aside>
  );
}

const Layout = createLayout(
  {
    Left: slot({ component: Sidebar, props: { side: "left" } }),
    Right: slot({ component: Sidebar, props: { side: "right" } }),
    Body: slot({ required: true }),
  },
  (_, { slots }) => (
    <div className="layout">
      {slots.Left}
      <main className="layout__body">{slots.Body}</main>
      {slots.Right}
    </div>
  ),
);

export function WithProps() {
  return (
    <section>
      <h3>Bound props — one component, two slots</h3>
      <p className="hint">
        Both sidebars share the same <code>Sidebar</code> component. The slot's{" "}
        <code>props</code> option binds <code>side</code> at definition time; a fill may
        still override it.
      </p>
      <Layout>
        <Layout.Left>Nav links</Layout.Left>
        <Layout.Body>Main content</Layout.Body>
        <Layout.Right>Related items</Layout.Right>
      </Layout>
    </section>
  );
}
