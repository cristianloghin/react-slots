import { render, screen } from "@testing-library/react";
import { createRef, forwardRef, memo, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createComponentWithSlots } from "../withSlots";

describe("ref forwarding", () => {
  describe("layout component", () => {
    const Layout = createComponentWithSlots({ Body: {} }).render<
      {},
      HTMLDivElement
    >(({ slots, ref }) => (
      <div ref={ref} data-testid="root">
        {slots.Body}
      </div>
    ));

    it("hands the call-site ref to the render function", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Layout ref={ref}>
          <Layout.Body>hi</Layout.Body>
        </Layout>
      );
      expect(ref.current).toBe(screen.getByTestId("root"));
    });

    it("supports callback refs", () => {
      const cb = vi.fn();
      render(
        <Layout ref={cb}>
          <Layout.Body>hi</Layout.Body>
        </Layout>
      );
      expect(cb).toHaveBeenCalledWith(screen.getByTestId("root"));
    });

    it("passes null to the render function when no ref is given", () => {
      let seen: unknown = "unset";
      const Bare = createComponentWithSlots({ Body: {} }).render(
        ({ slots, ref }) => {
          seen = ref;
          return <div>{slots.Body}</div>;
        }
      );
      render(
        <Bare>
          <Bare.Body>hi</Bare.Body>
        </Bare>
      );
      expect(seen).toBeNull();
    });

    it("forwards refs on context-enabled layouts and keeps the store", () => {
      const Panel = createComponentWithSlots(
        { Body: {} },
        { context: { open: false } }
      ).render<{}, HTMLElement>(({ slots, ref, provideContext }) => {
        provideContext({ open: true });
        return (
          <section ref={ref} data-testid="root">
            {slots.Body}
          </section>
        );
      });
      const ref = createRef<HTMLElement>();
      render(
        <Panel ref={ref}>
          <Panel.Body>hi</Panel.Body>
        </Panel>
      );
      expect(ref.current).toBe(screen.getByTestId("root"));
      expect(Panel.__storeContext).toBeDefined();
      expect(Panel.Body).toBeDefined();
    });
  });

  describe("slot components", () => {
    const Item = forwardRef<
      HTMLLIElement,
      { children?: ReactNode; tone?: string }
    >(({ children, tone }, ref) => (
      <li ref={ref} data-tone={tone}>
        {children}
      </li>
    ));

    it("forwards a ref through a component-backed slot", () => {
      const List = createComponentWithSlots({
        Item: { component: Item, multiple: true },
      }).render(({ slots }) => <ul>{slots.Item}</ul>);
      const ref = createRef<HTMLLIElement>();
      render(
        <List>
          <List.Item ref={ref} tone="a">
            one
          </List.Item>
        </List>
      );
      expect(ref.current).toBeInstanceOf(HTMLLIElement);
      expect(ref.current).toHaveAttribute("data-tone", "a");
      expect(ref.current).toHaveTextContent("one");
    });

    it("forwards a ref through a component-backed portal slot", () => {
      const Layout = createComponentWithSlots({
        Title: { component: Item, portal: true },
      }).render(({ slots }) => <header data-testid="h">{slots.Title}</header>);
      const ref = createRef<HTMLLIElement>();
      render(
        <Layout>
          <Layout.Title ref={ref}>portal</Layout.Title>
        </Layout>
      );
      expect(ref.current).toBeInstanceOf(HTMLLIElement);
      expect(screen.getByTestId("h")).toContainElement(ref.current);
    });

    it("keeps a forwardRef component's own statics but not React's keys", () => {
      const Nested = () => null;
      const Box = Object.assign(
        forwardRef<HTMLDivElement, { children?: ReactNode }>((p, ref) => (
          <div ref={ref}>{p.children}</div>
        )),
        { Nested }
      );
      const Layout = createComponentWithSlots({
        Box: { component: Box },
      }).render(({ slots }) => <>{slots.Box}</>);
      expect((Layout.Box as any).Nested).toBe(Nested);

      const ref = createRef<HTMLDivElement>();
      render(
        <Layout>
          <Layout.Box ref={ref}>boxed</Layout.Box>
        </Layout>
      );
      expect(ref.current).toHaveTextContent("boxed");
    });

    it("wraps memo components without corrupting the wrapper", () => {
      const Memoed = memo(({ children }: { children?: ReactNode }) => (
        <em>{children}</em>
      ));
      const Layout = createComponentWithSlots({
        M: { component: Memoed },
      }).render(({ slots }) => <>{slots.M}</>);
      render(
        <Layout>
          <Layout.M>memo</Layout.M>
        </Layout>
      );
      expect(screen.getByText("memo").tagName).toBe("EM");
    });

    it("gives a plain function component no ref prop when none is passed", () => {
      const Plain = vi.fn(({ children }: { children?: ReactNode }) => (
        <span>{children}</span>
      ));
      const Layout = createComponentWithSlots({
        Text: { component: Plain },
      }).render(({ slots }) => <>{slots.Text}</>);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <Layout>
          <Layout.Text>t</Layout.Text>
        </Layout>
      );
      expect(Plain).toHaveBeenCalled();
      expect(Plain.mock.calls[0][0]).not.toHaveProperty("ref");
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
