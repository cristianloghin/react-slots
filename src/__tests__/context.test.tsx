import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createLayout, createSlotContext, slot, useSlotContext } from "../index";

const PanelContext = createSlotContext({ open: false, toggle: () => {} });

function Status() {
  const open = useSlotContext(PanelContext, (s) => s.open);
  return <span data-testid="status">{open ? "open" : "closed"}</span>;
}

function Toggle() {
  const { toggle } = useSlotContext(PanelContext);
  return <button onClick={toggle}>toggle</button>;
}

const Panel = createLayout(
  { Header: slot(), Body: slot() },
  { context: PanelContext },
  (_, { slots, provide }) => {
    const [open, setOpen] = useState(false);
    provide({ open, toggle: () => setOpen((o) => !o) });
    return (
      <div>
        {slots.Header}
        {open && <div data-testid="body">{slots.Body}</div>}
      </div>
    );
  },
);

describe("slot context", () => {
  it("fills read the provided value and re-render when it changes", () => {
    render(
      <Panel>
        <Panel.Header>
          <Status />
          <Toggle />
        </Panel.Header>
        <Panel.Body>content</Panel.Body>
      </Panel>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("closed");
    expect(screen.queryByTestId("body")).toBeNull();
    act(() => screen.getByText("toggle").click());
    expect(screen.getByTestId("status")).toHaveTextContent("open");
    expect(screen.getByTestId("body")).toHaveTextContent("content");
  });

  it("returns the defaults outside any providing layout", () => {
    render(<Status />);
    expect(screen.getByTestId("status")).toHaveTextContent("closed");
  });

  it("keeps two instances isolated", () => {
    render(
      <>
        <Panel>
          <Panel.Header>
            <Status />
            <Toggle />
          </Panel.Header>
        </Panel>
        <Panel>
          <Panel.Header>
            <Status />
          </Panel.Header>
        </Panel>
      </>,
    );
    act(() => screen.getByText("toggle").click());
    const statuses = screen.getAllByTestId("status");
    expect(statuses[0]).toHaveTextContent("open");
    expect(statuses[1]).toHaveTextContent("closed");
  });

  it("the selector re-renders the consumer only when the selected value changes", () => {
    const renders = vi.fn();
    function Selected() {
      renders();
      useSlotContext(PanelContext, (s) => s.open);
      return null;
    }
    const Counting = createLayout(
      { X: slot() },
      { context: PanelContext },
      (_, { slots, provide }) => {
        const [n, setN] = useState(0);
        // `open` never changes; `toggle` is a new function each render.
        provide({ open: false, toggle: () => setN((v) => v + 1) });
        return (
          <div>
            {slots.X}
            <button onClick={() => setN((v) => v + 1)}>bump {n}</button>
          </div>
        );
      },
    );
    render(
      <Counting>
        <Counting.X>
          <Selected />
        </Counting.X>
      </Counting>,
    );
    const before = renders.mock.calls.length;
    act(() => screen.getByText(/bump/).click());
    // The layout re-rendered its children (so one render for that), but the
    // store notification did not cause an extra one.
    expect(renders.mock.calls.length).toBeLessThanOrEqual(before + 1);
  });

  it("a nested layout providing the same context shadows the outer one", () => {
    const Outer = createLayout(
      { X: slot() },
      { context: PanelContext },
      (_, { slots, provide }) => {
        provide({ open: true, toggle: () => {} });
        return <div>{slots.X}</div>;
      },
    );
    render(
      <Outer>
        <Outer.X>
          <Panel>
            <Panel.Header>
              <Status />
            </Panel.Header>
          </Panel>
        </Outer.X>
      </Outer>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("closed");
  });

  it("does not offer provide without a context", () => {
    let api: object | undefined;
    const Plain = createLayout({ X: slot() }, (_, a) => {
      api = a;
      return null;
    });
    render(<Plain />);
    expect(api).not.toHaveProperty("provide");
  });
});
