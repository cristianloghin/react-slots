import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
