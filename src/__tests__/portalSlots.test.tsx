import { act, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createComponentWithSlots } from "../index";

// ─── Shared layout fixture ────────────────────────────────────────────────────
// Header is a portal slot; Body is a regular slot. This mirrors the React Router
// case where <Body> holds an <Outlet /> and routed components teleport content
// into <Header> from across a render boundary.

const Layout = createComponentWithSlots({
  Header: { portal: true },
  Body: {},
}).render(({ slots }) => (
  <div>
    <header data-testid="header">{slots.Header}</header>
    <main data-testid="body">{slots.Body}</main>
  </div>
));

// Stand-in for a routed component rendered through an <Outlet />: it lives deep
// in the Body subtree, not among the Layout's direct children, yet fills Header.
function RoutePage({ title }: { title: string }) {
  return (
    <div>
      <Layout.Header>
        <h1>{title}</h1>
      </Layout.Header>
      <p>page body</p>
    </div>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("portal slots", () => {
  it("teleports content from a descendant into the slot position", () => {
    render(
      <Layout>
        <Layout.Body>
          <RoutePage title="Products" />
        </Layout.Body>
      </Layout>,
    );

    expect(screen.getByTestId("header")).toHaveTextContent("Products");
    // The portal element itself renders nothing where it sits in the body.
    expect(screen.getByTestId("body")).toHaveTextContent("page body");
  });

  it("does not render the portal element inline in the body", () => {
    render(
      <Layout>
        <Layout.Body>
          <RoutePage title="Products" />
        </Layout.Body>
      </Layout>,
    );

    // "Products" must appear once (in the header), never leaking into the body.
    expect(screen.getByTestId("body")).not.toHaveTextContent("Products");
  });

  it("updates the header when the registrant re-renders with new content", () => {
    function Page() {
      const [n, setN] = useState(0);
      return (
        <div>
          <Layout.Header>
            <span data-testid="count">{n}</span>
          </Layout.Header>
          <button onClick={() => setN((x) => x + 1)}>inc</button>
        </div>
      );
    }

    render(
      <Layout>
        <Layout.Body>
          <Page />
        </Layout.Body>
      </Layout>,
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
    act(() => screen.getByText("inc").click());
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("reverts to the call-site default when the routed registrant unmounts", () => {
    function App() {
      const [showRoute, setShowRoute] = useState(true);
      return (
        <Layout>
          {/* Default header provided at the layout's own call site. */}
          <Layout.Header>
            <span>Default</span>
          </Layout.Header>
          <Layout.Body>
            {showRoute ? <RoutePage title="Products" /> : <p>empty route</p>}
            <button onClick={() => setShowRoute(false)}>leave</button>
          </Layout.Body>
        </Layout>
      );
    }

    render(<App />);

    // Routed registrant mounts last, so it wins over the call-site default.
    expect(screen.getByTestId("header")).toHaveTextContent("Products");
    act(() => screen.getByText("leave").click());
    // Once the route unmounts, the default remains.
    expect(screen.getByTestId("header")).toHaveTextContent("Default");
  });

  it("renders multiple registrants when the portal slot is `multiple`", () => {
    const Multi = createComponentWithSlots({
      Actions: { portal: true, multiple: true },
      Body: {},
    }).render(({ slots }) => (
      <div>
        <nav data-testid="actions">{slots.Actions}</nav>
        <main>{slots.Body}</main>
      </div>
    ));

    render(
      <Multi>
        <Multi.Body>
          <Multi.Actions><button>Save</button></Multi.Actions>
          <Multi.Actions><button>Delete</button></Multi.Actions>
        </Multi.Body>
      </Multi>,
    );

    const actions = screen.getByTestId("actions");
    expect(actions).toHaveTextContent("Save");
    expect(actions).toHaveTextContent("Delete");
  });

  it("portal() reports presence and toggles chrome on fill / unfill", () => {
    const Gated = createComponentWithSlots({
      Header: { portal: true },
      Body: {},
    }).render(({ slots, portal }) => (
      <div>
        {portal("Header", (content) =>
          content ? <header data-testid="chrome">{content}</header> : null,
        )}
        <main>{slots.Body}</main>
      </div>
    ));

    function App() {
      const [show, setShow] = useState(false);
      return (
        <Gated>
          <Gated.Body>
            {show && (
              <Gated.Header>
                <span>Live</span>
              </Gated.Header>
            )}
            <button onClick={() => setShow((s) => !s)}>toggle</button>
          </Gated.Body>
        </Gated>
      );
    }

    render(<App />);

    // Nothing registered → boundary renders null, no chrome in the DOM.
    expect(screen.queryByTestId("chrome")).toBeNull();
    act(() => screen.getByText("toggle").click());
    expect(screen.getByTestId("chrome")).toHaveTextContent("Live");
    act(() => screen.getByText("toggle").click());
    expect(screen.queryByTestId("chrome")).toBeNull();
  });

  it("does not re-render heavy layout content when portal content changes", () => {
    const heavyRenders = vi.fn();

    function Heavy() {
      // A ref that survives only if this subtree is never re-rendered/remounted.
      const id = useRef(Math.random());
      heavyRenders();
      return <div data-testid="heavy">{id.current}</div>;
    }

    const Stable = createComponentWithSlots({
      Header: { portal: true },
      Body: {},
    }).render(({ slots, portal }) => (
      <div>
        {portal("Header", (content) => (content ? <header>{content}</header> : null))}
        <main>
          <Heavy />
          {slots.Body}
        </main>
      </div>
    ));

    function Page() {
      const [n, setN] = useState(0);
      return (
        <div>
          <Stable.Header>
            <span data-testid="count">{n}</span>
          </Stable.Header>
          <button onClick={() => setN((x) => x + 1)}>inc</button>
        </div>
      );
    }

    render(
      <Stable>
        <Stable.Body>
          <Page />
        </Stable.Body>
      </Stable>,
    );

    const before = screen.getByTestId("heavy").textContent;
    const rendersAfterMount = heavyRenders.mock.calls.length;

    // Repeatedly change the portal content; the heavy sibling must not re-render.
    act(() => screen.getByText("inc").click());
    act(() => screen.getByText("inc").click());

    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(heavyRenders.mock.calls.length).toBe(rendersAfterMount);
    expect(screen.getByTestId("heavy").textContent).toBe(before);
  });

  it("isolates portal content between two layout instances", () => {
    render(
      <div>
        <div data-testid="first">
          <Layout>
            <Layout.Body>
              <RoutePage title="One" />
            </Layout.Body>
          </Layout>
        </div>
        <div data-testid="second">
          <Layout>
            <Layout.Body>
              <RoutePage title="Two" />
            </Layout.Body>
          </Layout>
        </div>
      </div>,
    );

    const first = screen.getByTestId("first");
    const second = screen.getByTestId("second");
    expect(first).toHaveTextContent("One");
    expect(first).not.toHaveTextContent("Two");
    expect(second).toHaveTextContent("Two");
    expect(second).not.toHaveTextContent("One");
  });

  it("a portal change re-renders only the subscribed leaves, not the layout or siblings", () => {
    const rootRenders = vi.fn();
    const siblingRenders = vi.fn();
    const headerCallback = vi.fn();

    const Layout2 = createComponentWithSlots({
      Header: { portal: true },
      Body: {},
    }).render(({ slots, portal }) => {
      rootRenders();
      return (
        <div>
          {portal("Header", (content) => {
            headerCallback();
            return content ? <header>{content}</header> : null;
          })}
          <main>{slots.Body}</main>
        </div>
      );
    });

    // An unrelated component living in the body, NOT the portal registrant.
    function Sibling() {
      siblingRenders();
      return <div>sibling</div>;
    }

    function Page() {
      const [n, setN] = useState(0);
      return (
        <>
          <Layout2.Header>
            <span data-testid="n">{n}</span>
          </Layout2.Header>
          <button onClick={() => setN((x) => x + 1)}>inc</button>
        </>
      );
    }

    render(
      <Layout2>
        <Layout2.Body>
          <Sibling />
          <Page />
        </Layout2.Body>
      </Layout2>,
    );

    const rootBefore = rootRenders.mock.calls.length;
    const siblingBefore = siblingRenders.mock.calls.length;
    const headerBefore = headerCallback.mock.calls.length;

    act(() => screen.getByText("inc").click());

    expect(screen.getByTestId("n")).toHaveTextContent("1");
    // Negative controls: the layout root and the unrelated sibling do NOT re-render.
    expect(rootRenders.mock.calls.length).toBe(rootBefore);
    expect(siblingRenders.mock.calls.length).toBe(siblingBefore);
    // Positive control: the presence boundary DID re-render — so the assertions
    // above mean "isolated", not "nothing happened".
    expect(headerCallback.mock.calls.length).toBeGreaterThan(headerBefore);
  });
});
