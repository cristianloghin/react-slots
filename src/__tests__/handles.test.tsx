import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createLayout, slot } from "../index";

function Title({ level = 1, children }: { level?: 1 | 2; children?: ReactNode }) {
  const Tag = `h${level}` as const;
  return <Tag>{children}</Tag>;
}

describe("slot handles", () => {
  it("exposes filled, element and props on a single slot", () => {
    let seen: { filled: boolean; level?: number; hasElement: boolean } | undefined;
    const Layout = createLayout({ Title: slot({ component: Title }) }, (_, { slots }) => {
      seen = {
        filled: slots.Title.filled,
        level: slots.Title.props?.level,
        hasElement: slots.Title.element !== null,
      };
      return <>{slots.Title}</>;
    });
    render(
      <Layout>
        <Layout.Title level={2}>t</Layout.Title>
      </Layout>,
    );
    expect(seen).toEqual({ filled: true, level: 2, hasElement: true });

    render(<Layout />);
    expect(seen).toEqual({ filled: false, level: undefined, hasElement: false });
  });

  it("exposes elements and props on a multiple slot", () => {
    let levels: (number | undefined)[] = [];
    const Layout = createLayout(
      { Title: slot({ component: Title, multiple: true }) },
      (_, { slots }) => {
        levels = slots.Title.props.map((p) => p.level);
        return <>{slots.Title}</>;
      },
    );
    render(
      <Layout>
        <Layout.Title level={1}>a</Layout.Title>
        <Layout.Title level={2}>b</Layout.Title>
      </Layout>,
    );
    expect(levels).toEqual([1, 2]);
  });

  it("render(extra) merges props into the fill", () => {
    const Layout = createLayout(
      { Title: slot({ component: Title }), Many: slot({ component: Title, multiple: true }) },
      (_, { slots }) => (
        <div>
          {slots.Title.render({ level: 2 })}
          {slots.Many.render({ level: 2 })}
        </div>
      ),
    );
    render(
      <Layout>
        <Layout.Title>one</Layout.Title>
        <Layout.Many>two</Layout.Many>
        <Layout.Many>three</Layout.Many>
      </Layout>,
    );
    expect(screen.getByText("one").tagName).toBe("H2");
    expect(screen.getByText("two").tagName).toBe("H2");
    expect(screen.getByText("three").tagName).toBe("H2");
  });

  it("render(extra) on an unfilled slot renders the fallback", () => {
    const Layout = createLayout(
      { Title: slot({ component: Title, fallback: <i>none</i> }) },
      (_, { slots }) => <div>{slots.Title.render({ level: 2 })}</div>,
    );
    render(<Layout />);
    expect(screen.getByText("none").tagName).toBe("I");
  });

  it("when() receives the content or null, and the fallback does not count as content", () => {
    const Layout = createLayout(
      { Header: slot({ fallback: <i>fb</i> }) },
      (_, { slots }) => (
        <div>
          {slots.Header.when((c) => (c ? <header>{c}</header> : <p>no header</p>))}
        </div>
      ),
    );
    const { rerender } = render(<Layout />);
    expect(screen.getByText("no header")).toBeInTheDocument();
    rerender(
      <Layout>
        <Layout.Header>hi</Layout.Header>
      </Layout>,
    );
    expect(screen.getByText("hi").closest("header")).not.toBeNull();
  });

  it("a fallback renders in place but does not count as filled", () => {
    let filled: boolean | undefined;
    const Layout = createLayout({ X: slot({ fallback: "fb" }) }, (_, { slots }) => {
      filled = slots.X.filled;
      return <div data-testid="x">{slots.X}</div>;
    });
    render(<Layout />);
    expect(filled).toBe(false);
    expect(screen.getByTestId("x")).toHaveTextContent("fb");
  });

  describe("groups", () => {
    const Page = createLayout(
      {
        Header: { Title: slot(), Actions: slot({ multiple: true }) },
        Body: slot(),
      },
      (_, { slots }) => (
        <div>
          {slots.Header.when((h) => h && <header data-testid="header">{h}</header>)}
          <main>{slots.Body}</main>
        </div>
      ),
    );

    it("exposes nested accessors for a group", () => {
      render(
        <Page>
          <Page.Header.Title>T</Page.Header.Title>
          <Page.Header.Actions>A1</Page.Header.Actions>
          <Page.Header.Actions>A2</Page.Header.Actions>
          <Page.Body>B</Page.Body>
        </Page>,
      );
      expect(screen.getByTestId("header")).toHaveTextContent("TA1A2");
    });

    it("group.filled is true when any member is filled", () => {
      const { rerender } = render(
        <Page>
          <Page.Body>B</Page.Body>
        </Page>,
      );
      expect(screen.queryByTestId("header")).toBeNull();
      rerender(
        <Page>
          <Page.Header.Actions>A</Page.Header.Actions>
        </Page>,
      );
      expect(screen.getByTestId("header")).toHaveTextContent("A");
    });

    it("rendering a group emits its slots in config order", () => {
      const Layout = createLayout(
        { G: { B: slot(), A: slot() } },
        (_, { slots }) => <div data-testid="g">{slots.G}</div>,
      );
      render(
        <Layout>
          <Layout.G.A>a</Layout.G.A>
          <Layout.G.B>b</Layout.G.B>
        </Layout>,
      );
      expect(screen.getByTestId("g")).toHaveTextContent("ba");
    });

    it("a group is not a component", () => {
      expect(typeof Page.Header).toBe("object");
      expect(typeof Page.Header.Title).toBe("function");
    });

    it("groups nest to any depth", () => {
      const Layout = createLayout(
        { A: { B: { C: slot() } } },
        (_, { slots }) => <div data-testid="c">{slots.A.B.C}</div>,
      );
      render(
        <Layout>
          <Layout.A.B.C>deep</Layout.A.B.C>
        </Layout>,
      );
      expect(screen.getByTestId("c")).toHaveTextContent("deep");
    });
  });
});
