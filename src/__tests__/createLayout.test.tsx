import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLayout, slot } from "../index";

const Card = createLayout(
  {
    Header: slot(),
    Body: slot({ required: true }),
    Footer: slot({ fallback: <em>no footer</em> }),
    Tag: slot({ multiple: true }),
  },
  ({ className }: { className?: string }, { slots, children }) => (
    <div className={className} data-testid="card">
      <div data-testid="header">{slots.Header}</div>
      <div data-testid="body">{slots.Body}</div>
      <div data-testid="tags">{slots.Tag}</div>
      <div data-testid="footer">{slots.Footer}</div>
      <div data-testid="rest">{children}</div>
    </div>
  ),
);

afterEach(() => vi.restoreAllMocks());

describe("createLayout", () => {
  it("renders fills at their slot positions and passes props through", () => {
    render(
      <Card className="c">
        <Card.Header>Title</Card.Header>
        <Card.Body>Content</Card.Body>
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveClass("c");
    expect(screen.getByTestId("header")).toHaveTextContent("Title");
    expect(screen.getByTestId("body")).toHaveTextContent("Content");
  });

  it("renders the fallback when a slot is unfilled, and nothing otherwise", () => {
    render(
      <Card>
        <Card.Body>b</Card.Body>
      </Card>,
    );
    expect(screen.getByTestId("footer")).toHaveTextContent("no footer");
    expect(screen.getByTestId("header")).toBeEmptyDOMElement();
  });

  it("collects multiple fills in order, adding keys when missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Card>
        <Card.Body>b</Card.Body>
        <Card.Tag>one</Card.Tag>
        <Card.Tag>two</Card.Tag>
      </Card>,
    );
    expect(screen.getByTestId("tags")).toHaveTextContent("onetwo");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("does not warn about keys when handles are rendered directly", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Card>
        <Card.Header>h</Card.Header>
        <Card.Body>b</Card.Body>
        <Card.Tag>t</Card.Tag>
      </Card>,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs an error when a required slot is missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Card />);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Required slots missing: Body"));
  });

  it("warns when a single slot receives more than one fill and keeps the last", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Card>
        <Card.Body>first</Card.Body>
        <Card.Body>second</Card.Body>
      </Card>,
    );
    expect(screen.getByTestId("body")).toHaveTextContent("second");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Slot "Body"'));
  });

  it("hands non-slot children, including text, to the render function", () => {
    render(
      <Card>
        <Card.Body>b</Card.Body>
        <p>loose</p>
        plain text
      </Card>,
    );
    expect(screen.getByTestId("rest")).toHaveTextContent("loose");
    expect(screen.getByTestId("rest")).toHaveTextContent("plain text");
  });

  it("looks through fragments when collecting", () => {
    render(
      <Card>
        <>
          <Card.Header>h</Card.Header>
          <Card.Body>b</Card.Body>
        </>
      </Card>,
    );
    expect(screen.getByTestId("header")).toHaveTextContent("h");
    expect(screen.getByTestId("body")).toHaveTextContent("b");
  });

  it("keeps two slots backed by the same component distinct", () => {
    const Box = ({ children }: { children?: ReactNode }) => <span>{children}</span>;
    const Layout = createLayout(
      { A: slot({ component: Box }), B: slot({ component: Box }) },
      (_, { slots }) => (
        <div>
          <div data-testid="a">{slots.A}</div>
          <div data-testid="b">{slots.B}</div>
        </div>
      ),
    );
    render(
      <Layout>
        <Layout.B>bee</Layout.B>
        <Layout.A>ay</Layout.A>
      </Layout>,
    );
    expect(screen.getByTestId("a")).toHaveTextContent("ay");
    expect(screen.getByTestId("b")).toHaveTextContent("bee");
  });

  it("binds props at definition time and lets a fill override them", () => {
    const Side = ({ side, children }: { side: "left" | "right"; children?: ReactNode }) => (
      <aside data-side={side}>{children}</aside>
    );
    const Layout = createLayout(
      {
        Left: slot({ component: Side, props: { side: "left" } }),
        Right: slot({ component: Side, props: { side: "left" } }),
      },
      (_, { slots }) => (
        <div>
          {slots.Left}
          {slots.Right}
        </div>
      ),
    );
    render(
      <Layout>
        <Layout.Left>l</Layout.Left>
        <Layout.Right side="right">r</Layout.Right>
      </Layout>,
    );
    expect(screen.getByText("l")).toHaveAttribute("data-side", "left");
    expect(screen.getByText("r")).toHaveAttribute("data-side", "right");
  });

  it("isolates two instances of the same layout", () => {
    render(
      <>
        <Card>
          <Card.Body>one</Card.Body>
        </Card>
        <Card>
          <Card.Body>two</Card.Body>
        </Card>
      </>,
    );
    const bodies = screen.getAllByTestId("body");
    expect(bodies[0]).toHaveTextContent("one");
    expect(bodies[1]).toHaveTextContent("two");
  });

  it("rejects reserved slot names", () => {
    expect(() => createLayout({ filled: slot() }, () => null)).toThrow(/cannot be used/);
    expect(() => createLayout({ when: slot() }, () => null)).toThrow(/cannot be used/);
    expect(() => createLayout({ constructor: slot() }, () => null)).toThrow(/cannot be used/);
  });

  it("rejects config entries that are neither slots nor groups", () => {
    expect(() => createLayout({ X: 1 as any }, () => null)).toThrow(/must be a slot\(\)/);
  });

  it("requires a context made with createSlotContext", () => {
    expect(() =>
      createLayout({ X: slot() }, { context: { open: false } as any }, () => null),
    ).toThrow(/createSlotContext/);
  });
});
