import { act, render, screen } from "@testing-library/react";
import { memo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLayout, slot } from "../index";

afterEach(() => vi.restoreAllMocks());

// Header is a portal slot; Body is a regular slot holding "routed" content.
const Layout = createLayout(
  { Header: slot({ portal: true }), Body: slot() },
  (_, { slots }) => (
    <div>
      <header data-testid="header">{slots.Header}</header>
      <main data-testid="body">{slots.Body}</main>
    </div>
  ),
);

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
    expect(screen.getByTestId("body")).not.toHaveTextContent("Products");
    expect(screen.getByTestId("body")).toHaveTextContent("page body");
  });

  it("updates when the registrant re-renders with new content", () => {
    function Counter() {
      const [n, setN] = useState(0);
      return (
        <div>
          <Layout.Header>count {n}</Layout.Header>
          <button onClick={() => setN((v) => v + 1)}>inc</button>
        </div>
      );
    }
    render(
      <Layout>
        <Layout.Body>
          <Counter />
        </Layout.Body>
      </Layout>,
    );
    expect(screen.getByTestId("header")).toHaveTextContent("count 0");
    act(() => screen.getByText("inc").click());
    expect(screen.getByTestId("header")).toHaveTextContent("count 1");
  });

  it("uses a call-site fill as the default and reverts to it when the deeper one unmounts", () => {
    function Shell({ routed }: { routed: boolean }) {
      return (
        <Layout>
          <Layout.Header>default</Layout.Header>
          <Layout.Body>{routed && <RoutePage title="Routed" />}</Layout.Body>
        </Layout>
      );
    }
    const { rerender } = render(<Shell routed />);
    expect(screen.getByTestId("header")).toHaveTextContent("Routed");
    rerender(<Shell routed={false} />);
    expect(screen.getByTestId("header")).toHaveTextContent("default");
  });

  it("renders every registrant when the slot is multiple", () => {
    const Bar = createLayout(
      { Action: slot({ portal: true, multiple: true }), Body: slot() },
      (_, { slots }) => (
        <div>
          <nav data-testid="actions">{slots.Action}</nav>
          {slots.Body}
        </div>
      ),
    );
    render(
      <Bar>
        <Bar.Body>
          <div>
            <Bar.Action>one</Bar.Action>
          </div>
          <div>
            <Bar.Action>two</Bar.Action>
          </div>
        </Bar.Body>
      </Bar>,
    );
    expect(screen.getByTestId("actions")).toHaveTextContent("onetwo");
  });

  it("when() reports presence and toggles chrome on fill / unfill", () => {
    const Chrome = createLayout(
      { Header: slot({ portal: true }), Body: slot() },
      (_, { slots }) => (
        <div>
          {slots.Header.when((c) => (c ? <header data-testid="chrome">{c}</header> : null))}
          {slots.Body}
        </div>
      ),
    );
    function Shell({ show }: { show: boolean }) {
      return (
        <Chrome>
          <Chrome.Body>{show && <Chrome.Header>hi</Chrome.Header>}</Chrome.Body>
        </Chrome>
      );
    }
    const { rerender } = render(<Shell show={false} />);
    expect(screen.queryByTestId("chrome")).toBeNull();
    rerender(<Shell show />);
    expect(screen.getByTestId("chrome")).toHaveTextContent("hi");
    rerender(<Shell show={false} />);
    expect(screen.queryByTestId("chrome")).toBeNull();
  });

  it("re-renders only the subscribed leaf, not the layout body", () => {
    const heavyRenders = vi.fn();
    const Heavy = memo(function Heavy() {
      heavyRenders();
      return <div>heavy</div>;
    });
    const layoutRenders = vi.fn();
    const Shell = createLayout(
      { Header: slot({ portal: true }), Body: slot() },
      (_, { slots }) => {
        layoutRenders();
        return (
          <div>
            {slots.Header.when((c) => c && <header>{c}</header>)}
            <Heavy />
            {slots.Body}
          </div>
        );
      },
    );
    function Counter() {
      const [n, setN] = useState(0);
      return (
        <div>
          <Shell.Header>n{n}</Shell.Header>
          <button onClick={() => setN((v) => v + 1)}>inc</button>
        </div>
      );
    }
    render(
      <Shell>
        <Shell.Body>
          <Counter />
        </Shell.Body>
      </Shell>,
    );
    const before = { heavy: heavyRenders.mock.calls.length, layout: layoutRenders.mock.calls.length };
    act(() => screen.getByText("inc").click());
    expect(heavyRenders.mock.calls.length).toBe(before.heavy);
    expect(layoutRenders.mock.calls.length).toBe(before.layout);
  });

  it("isolates portal content between two layout instances", () => {
    render(
      <>
        <Layout>
          <Layout.Body>
            <RoutePage title="A" />
          </Layout.Body>
        </Layout>
        <Layout>
          <Layout.Body>
            <RoutePage title="B" />
          </Layout.Body>
        </Layout>
      </>,
    );
    const headers = screen.getAllByTestId("header");
    expect(headers[0]).toHaveTextContent("A");
    expect(headers[0]).not.toHaveTextContent("B");
    expect(headers[1]).toHaveTextContent("B");
  });

  it("logs an error when a portal fill has no layout above it", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Layout.Header>lost</Layout.Header>);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("outside its layout"));
    expect(screen.queryByText("lost")).toBeNull();
  });

  it("does not enforce required on portal slots", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Strict = createLayout(
      { Header: slot({ portal: true, required: true }) },
      (_, { slots }) => <div>{slots.Header}</div>,
    );
    render(<Strict />);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("supports function children on a portal fill", () => {
    const Inner = createLayout({ Title: slot() }, (_, { slots }) => <h1>{slots.Title}</h1>);
    const Shell = createLayout(
      { Header: slot({ portal: true, component: Inner }), Body: slot() },
      (_, { slots }) => (
        <div>
          <header data-testid="h">{slots.Header}</header>
          {slots.Body}
        </div>
      ),
    );
    render(
      <Shell>
        <Shell.Body>
          <div>
            <Shell.Header>{(h) => <h.Title>split</h.Title>}</Shell.Header>
          </div>
        </Shell.Body>
      </Shell>,
    );
    expect(screen.getByTestId("h").querySelector("h1")).toHaveTextContent("split");
  });
});
