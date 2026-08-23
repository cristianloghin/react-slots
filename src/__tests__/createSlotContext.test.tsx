import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createComponentWithSlots, createSlotContext, useSlotContext } from "../index";

// ─── Standalone context, declared before any layout exists ───────────────────

const PanelContext = createSlotContext({ open: false, label: "default" });

// A slot component that references only the context — never the layout.
// This is the decoupling the API exists for: in real code this component
// lives in its own module with no import of the layout.
function OpenDisplay() {
  const open = useSlotContext(PanelContext, s => s.open);
  return <span data-testid="open">{String(open)}</span>;
}

const Panel = createComponentWithSlots(
  { Body: {} },
  { context: PanelContext },
).render<{ open?: boolean }>(({ slots, provideContext, open = false }) => {
  provideContext({ open, label: "provided" });
  return <div>{slots.Body}</div>;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("createSlotContext", () => {
  it("slot component reads values through the standalone context", () => {
    render(
      <Panel open>
        <Panel.Body>
          <OpenDisplay />
        </Panel.Body>
      </Panel>,
    );
    expect(screen.getByTestId("open")).toHaveTextContent("true");
  });

  it("returns the declared defaults outside any layout instance", () => {
    render(<OpenDisplay />);
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("the layout component and the context object read the same store", () => {
    function BothHandles() {
      const viaContext = useSlotContext(PanelContext, s => s.label);
      const viaLayout = useSlotContext(Panel, s => s.label);
      return (
        <span data-testid="both">
          {viaContext}:{viaLayout}
        </span>
      );
    }

    render(
      <Panel>
        <Panel.Body>
          <BothHandles />
        </Panel.Body>
      </Panel>,
    );
    expect(screen.getByTestId("both")).toHaveTextContent("provided:provided");
  });

  it("slot component re-renders when the provided value changes", async () => {
    const CounterContext = createSlotContext({ count: 0 });

    function Counter() {
      const count = useSlotContext(CounterContext, s => s.count);
      return <span data-testid="counter">{count}</span>;
    }

    const CounterLayout = createComponentWithSlots(
      { Content: {} },
      { context: CounterContext },
    ).render(({ slots, provideContext }) => {
      const [count, setCount] = useState(0);
      provideContext({ count });
      return (
        <div>
          {slots.Content}
          <button data-testid="btn" onClick={() => setCount(n => n + 1)}>+</button>
        </div>
      );
    });

    render(
      <CounterLayout>
        <CounterLayout.Content>
          <Counter />
        </CounterLayout.Content>
      </CounterLayout>,
    );

    expect(screen.getByTestId("counter")).toHaveTextContent("0");

    await act(async () => {
      screen.getByTestId("btn").click();
    });

    expect(screen.getByTestId("counter")).toHaveTextContent("1");
  });

  it("two instances of a layout sharing one context stay isolated", () => {
    const IdContext = createSlotContext({ id: "" });

    function IdDisplay() {
      const id = useSlotContext(IdContext, s => s.id);
      return <span data-testid={`id-${id}`}>{id}</span>;
    }

    const IdLayout = createComponentWithSlots(
      { Content: {} },
      { context: IdContext },
    ).render<{ id: string }>(({ slots, provideContext, id }) => {
      provideContext({ id });
      return <div>{slots.Content}</div>;
    });

    render(
      <>
        <IdLayout id="alpha">
          <IdLayout.Content><IdDisplay /></IdLayout.Content>
        </IdLayout>
        <IdLayout id="beta">
          <IdLayout.Content><IdDisplay /></IdLayout.Content>
        </IdLayout>
      </>,
    );

    expect(screen.getByTestId("id-alpha")).toHaveTextContent("alpha");
    expect(screen.getByTestId("id-beta")).toHaveTextContent("beta");
  });

  it("a nested layout providing the same context shadows the outer one", () => {
    const SharedContext = createSlotContext({ depth: 0 });

    function DepthDisplay({ testId }: { testId: string }) {
      const depth = useSlotContext(SharedContext, s => s.depth);
      return <span data-testid={testId}>{depth}</span>;
    }

    const DepthLayout = createComponentWithSlots(
      { Content: {} },
      { context: SharedContext },
    ).render<{ depth: number }>(({ slots, provideContext, depth }) => {
      provideContext({ depth });
      return <div>{slots.Content}</div>;
    });

    render(
      <DepthLayout depth={1}>
        <DepthLayout.Content>
          <DepthDisplay testId="outer" />
          <DepthLayout depth={2}>
            <DepthLayout.Content>
              <DepthDisplay testId="inner" />
            </DepthLayout.Content>
          </DepthLayout>
        </DepthLayout.Content>
      </DepthLayout>,
    );

    expect(screen.getByTestId("outer")).toHaveTextContent("1");
    expect(screen.getByTestId("inner")).toHaveTextContent("2");
  });
});
