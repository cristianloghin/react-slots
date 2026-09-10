import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, forwardRef, memo, ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createComponentWithSlots, withProps } from "../index";

function Sidebar({
  side,
  label,
  children,
}: {
  side: "left" | "right";
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <aside data-testid={`sidebar-${side}`}>
      {label && <span data-testid="label">{label}</span>}
      {children}
    </aside>
  );
}

describe("withProps", () => {
  it("applies bound props at render time", () => {
    const LeftSidebar = withProps(Sidebar, { side: "left" });
    render(<LeftSidebar>content</LeftSidebar>);
    expect(screen.getByTestId("sidebar-left")).toBeInTheDocument();
  });

  it("consumer props override bound props", () => {
    const LeftSidebar = withProps(Sidebar, { side: "left" });
    // Bound props stay optional in the type, so overriding is allowed
    render(<LeftSidebar side="right">content</LeftSidebar>);
    expect(screen.getByTestId("sidebar-right")).toBeInTheDocument();
  });

  it("bound props act as defaults — unbound props still required", () => {
    const LeftSidebar = withProps(Sidebar, { side: "left" });
    render(<LeftSidebar label="Nav">content</LeftSidebar>);
    expect(screen.getByTestId("label")).toHaveTextContent("Nav");
  });

  it("passes children through", () => {
    const LeftSidebar = withProps(Sidebar, { side: "left" });
    render(<LeftSidebar>hello</LeftSidebar>);
    expect(screen.getByTestId("sidebar-left")).toHaveTextContent("hello");
  });

  it("renders a forwardRef component and forwards the ref to it", () => {
    // A forwardRef component is an object, not a callable: calling it as a
    // function (the old implementation) threw "is not a function".
    const Panel = forwardRef<
      HTMLElement,
      { side: "left" | "right"; children?: ReactNode }
    >(({ side, children }, ref) => (
      <aside ref={ref} data-testid={`panel-${side}`}>
        {children}
      </aside>
    ));
    const LeftPanel = withProps(Panel, { side: "left" });
    const ref = createRef<HTMLElement>();
    render(<LeftPanel ref={ref}>content</LeftPanel>);
    expect(ref.current).toBe(screen.getByTestId("panel-left"));
  });

  it("forwards the ref through a slot config", () => {
    const Panel = forwardRef<
      HTMLElement,
      { side: "left" | "right"; children?: ReactNode }
    >(({ side, children }, ref) => (
      <aside ref={ref} data-testid={`panel-${side}`}>
        {children}
      </aside>
    ));
    const Layout = createComponentWithSlots({
      Left: { component: withProps(Panel, { side: "left" }) },
    }).render(({ slots }) => <div>{slots.Left}</div>);
    const ref = createRef<HTMLElement>();
    render(
      <Layout>
        <Layout.Left ref={ref}>nav</Layout.Left>
      </Layout>
    );
    expect(ref.current).toBe(screen.getByTestId("panel-left"));
    expect(ref.current).toHaveTextContent("nav");
  });

  it("renders a memo component", () => {
    const Memoed = memo(Sidebar);
    const LeftSidebar = withProps(Memoed, { side: "left" });
    render(<LeftSidebar>memo</LeftSidebar>);
    expect(screen.getByTestId("sidebar-left")).toHaveTextContent("memo");
  });

  it("gives a plain function component no ref prop when none is passed", () => {
    const Plain = vi.fn(({ children }: { children?: ReactNode; tag: string }) => (
      <span>{children}</span>
    ));
    const Tagged = withProps(Plain, { tag: "x" });
    render(<Tagged>t</Tagged>);
    expect(Plain.mock.calls[0][0]).toEqual({ tag: "x", children: "t" });
  });

  it("runs the wrapped component's hooks in its own instance", () => {
    // Calling the component as a function ran its hooks inside the wrapper;
    // rendering it as an element gives it a component instance of its own.
    function Counter({ label }: { label: string }) {
      const [n, setN] = useState(0);
      return (
        <button onClick={() => setN(n + 1)}>
          {label} {n}
        </button>
      );
    }
    const Labeled = withProps(Counter, { label: "count" });
    render(<Labeled />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("count 1");
  });

  it("works inside a slot config", () => {
    const Layout = createComponentWithSlots({
      Left: { component: withProps(Sidebar, { side: "left" }) },
      Right: { component: withProps(Sidebar, { side: "right" }) },
    }).render(({ slots }) => (
      <div>
        {slots.Left}
        {slots.Right}
      </div>
    ));

    render(
      <Layout>
        <Layout.Left>nav</Layout.Left>
        <Layout.Right>aside</Layout.Right>
      </Layout>
    );

    expect(screen.getByTestId("sidebar-left")).toHaveTextContent("nav");
    expect(screen.getByTestId("sidebar-right")).toHaveTextContent("aside");
  });
});
