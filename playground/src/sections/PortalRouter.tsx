import { createComponentWithSlots } from "@mikrostack/rst";
import { useState } from "react";
import {
  Link,
  MemoryRouter,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

// Layout with a PORTAL Header slot and a regular Body that holds the Outlet.
const Layout = createComponentWithSlots({
  Header: { portal: true },
  Body: {},
}).render(({ slots, portal }) => (
  <div className="card">
    <div className="card__header">
      {portal("Header", (content) =>
        content ? content : <em>— no header from route —</em>,
      )}
    </div>
    <div className="card__body">{slots.Body}</div>
  </div>
));

// A routed page that teleports its own live state into the Layout Header.
function ProductsPage() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Layout.Header>
        <strong>Products ({count})</strong>
      </Layout.Header>
      <p>Products page body.</p>
      <button className="panel-btn" onClick={() => setCount((c) => c + 1)}>
        + add
      </button>
    </div>
  );
}

function AboutPage() {
  return (
    <div>
      <Layout.Header>
        <strong>About us</strong>
      </Layout.Header>
      <p>About page body.</p>
    </div>
  );
}

function Shell() {
  return (
    <Layout>
      <Layout.Body>
        <nav style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <Link to="/products">Products</Link>
          <Link to="/about">About</Link>
        </nav>
        <Outlet />
      </Layout.Body>
    </Layout>
  );
}

export function PortalRouter() {
  return (
    <section>
      <h3>Portal slot — header teleported across an Outlet boundary</h3>
      <p className="hint">
        The <code>Header</code> slot is <code>{`{ portal: true }`}</code>. Each
        routed page renders <code>&lt;Layout.Header&gt;</code> from inside the{" "}
        <code>&lt;Outlet /&gt;</code>; it should appear in the card header
        above the body. Click <em>+ add</em> to confirm live state teleports.
      </p>
      <MemoryRouter initialEntries={["/products"]}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </section>
  );
}
