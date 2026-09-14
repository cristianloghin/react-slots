import { render, screen } from "@testing-library/react";
import { createRef, forwardRef, memo, ReactNode, Ref } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLayout, slot } from "../index";

afterEach(() => vi.restoreAllMocks());

describe("ref forwarding", () => {
  describe("layout", () => {
    const Scroller = createLayout(
      { Body: slot() },
      ({ ref, className }: { className?: string; ref?: Ref<HTMLDivElement> }, { slots }) => (
        <div ref={ref} className={className} data-testid="root">
          {slots.Body}
        </div>
      ),
    );

    it("hands the call-site ref to the render function as props.ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Scroller ref={ref} className="s">
          <Scroller.Body>b</Scroller.Body>
        </Scroller>,
      );
      expect(ref.current).toBe(screen.getByTestId("root"));
    });

    it("supports callback refs", () => {
      const cb = vi.fn();
      render(<Scroller ref={cb} />);
      expect(cb).toHaveBeenCalledWith(screen.getByTestId("root"));
    });

    it("passes null when no ref is given", () => {
      let seen: unknown = "unset";
      const L = createLayout({ X: slot() }, (p: { ref?: Ref<HTMLDivElement> }) => {
        seen = p.ref;
        return null;
      });
      render(<L />);
      expect(seen).toBeNull();
    });
  });

  describe("fills", () => {
    const Item = forwardRef<HTMLLIElement, { children?: ReactNode; tone?: string }>(
      ({ children, tone }, ref) => (
        <li ref={ref} data-tone={tone}>
          {children}
        </li>
      ),
    );

    it("forwards a ref through a component-backed slot", () => {
      const List = createLayout(
        { Item: slot({ component: Item, multiple: true }) },
        (_, { slots }) => <ul>{slots.Item}</ul>,
      );
      const ref = createRef<HTMLLIElement>();
      render(
        <List>
          <List.Item ref={ref} tone="a">
            one
          </List.Item>
        </List>,
      );
      expect(ref.current).toBeInstanceOf(HTMLLIElement);
      expect(ref.current).toHaveAttribute("data-tone", "a");
    });

    it("forwards a ref through a component-backed portal slot", () => {
      const Layout = createLayout(
        { Title: slot({ component: Item, portal: true }) },
        (_, { slots }) => <header data-testid="h">{slots.Title}</header>,
      );
      const ref = createRef<HTMLLIElement>();
      render(
        <Layout>
          <Layout.Title ref={ref}>portal</Layout.Title>
        </Layout>,
      );
      expect(ref.current).toBeInstanceOf(HTMLLIElement);
      expect(screen.getByTestId("h")).toContainElement(ref.current);
    });

    it("keeps a forwardRef component's own statics but not React's keys", () => {
      const Nested = () => null;
      const Box = Object.assign(
        forwardRef<HTMLDivElement, { children?: ReactNode }>((p, ref) => <div ref={ref}>{p.children}</div>),
        { Nested },
      );
      const Layout = createLayout({ Box: slot({ component: Box }) }, (_, { slots }) => <>{slots.Box}</>);
      expect((Layout.Box as any).Nested).toBe(Nested);
      const ref = createRef<HTMLDivElement>();
      render(
        <Layout>
          <Layout.Box ref={ref}>boxed</Layout.Box>
        </Layout>,
      );
      expect(ref.current).toHaveTextContent("boxed");
    });

    it("wraps memo components without corrupting the wrapper", () => {
      const Memoed = memo(({ children }: { children?: ReactNode }) => <em>{children}</em>);
      const Layout = createLayout({ M: slot({ component: Memoed }) }, (_, { slots }) => <>{slots.M}</>);
      render(
        <Layout>
          <Layout.M>memo</Layout.M>
        </Layout>,
      );
      expect(screen.getByText("memo").tagName).toBe("EM");
    });

    it("gives a plain function component no ref prop when none is passed", () => {
      const Plain = vi.fn(({ children }: { children?: ReactNode }) => <span>{children}</span>);
      const Layout = createLayout({ Text: slot({ component: Plain }) }, (_, { slots }) => <>{slots.Text}</>);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <Layout>
          <Layout.Text>t</Layout.Text>
        </Layout>,
      );
      expect(Plain.mock.calls[0][0]).not.toHaveProperty("ref");
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
