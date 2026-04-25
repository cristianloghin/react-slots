import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createComponentWithSlots, useSlotContext } from "../index";

// ─── Shared layout fixture ────────────────────────────────────────────────────

const Layout = createComponentWithSlots(
  {
    Content: {},
  },
  {
    context: {
      count: 0,
      label: "default",
    },
  },
).render(({ slots, provideContext }) => {
  provideContext({ count: 0, label: "default" });
  return <div>{slots.Content}</div>;
});

// ─── Slot component that reads context ───────────────────────────────────────

function CountDisplay() {
  const count = useSlotContext(Layout, s => s.count);
  return <span data-testid="count">{count}</span>;
}

function LabelDisplay() {
  const label = useSlotContext(Layout, s => s.label);
  return <span data-testid="label">{label}</span>;
}

function FullContextDisplay() {
  const ctx = useSlotContext(Layout);
  return <span data-testid="full">{ctx.count}:{ctx.label}</span>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useSlotContext", () => {
  it("slot component receives default context values", () => {
    render(
      <Layout>
        <Layout.Content>
          <CountDisplay />
        </Layout.Content>
      </Layout>
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("selector picks the correct field", () => {
    render(
      <Layout>
        <Layout.Content>
          <LabelDisplay />
        </Layout.Content>
      </Layout>
    );
    expect(screen.getByTestId("label")).toHaveTextContent("default");
  });

  it("full-shape overload returns the entire context object", () => {
    render(
      <Layout>
        <Layout.Content>
          <FullContextDisplay />
        </Layout.Content>
      </Layout>
    );
    expect(screen.getByTestId("full")).toHaveTextContent("0:default");
  });

  it("slot component re-renders when the selected value changes", async () => {
    const DynamicLayout = createComponentWithSlots(
      { Content: {} },
      { context: { count: 0 } },
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

    function Counter() {
      const count = useSlotContext(DynamicLayout, s => s.count);
      return <span data-testid="counter">{count}</span>;
    }

    render(
      <DynamicLayout>
        <DynamicLayout.Content>
          <Counter />
        </DynamicLayout.Content>
      </DynamicLayout>
    );

    expect(screen.getByTestId("counter")).toHaveTextContent("0");

    await act(async () => {
      screen.getByTestId("btn").click();
    });

    expect(screen.getByTestId("counter")).toHaveTextContent("1");
  });

  it("two instances of the same layout have isolated context", () => {
    const IsolatedLayout = createComponentWithSlots(
      { Content: {} },
      { context: { id: "" } },
    ).render(({ slots, provideContext, id }: { id: string; slots: any; nonSlotChildren: any; provideContext: any }) => {
      provideContext({ id });
      return <div>{slots.Content}</div>;
    });

    function IdDisplay() {
      const id = useSlotContext(IsolatedLayout, s => s.id);
      return <span data-testid={`id-${id}`}>{id}</span>;
    }

    render(
      <>
        <IsolatedLayout id="alpha">
          <IsolatedLayout.Content><IdDisplay /></IsolatedLayout.Content>
        </IsolatedLayout>
        <IsolatedLayout id="beta">
          <IsolatedLayout.Content><IdDisplay /></IsolatedLayout.Content>
        </IsolatedLayout>
      </>
    );

    expect(screen.getByTestId("id-alpha")).toHaveTextContent("alpha");
    expect(screen.getByTestId("id-beta")).toHaveTextContent("beta");
  });

  it("returns default context values when used outside any layout instance", () => {
    function Orphan() {
      const count = useSlotContext(Layout, s => s.count);
      return <span data-testid="orphan">{count}</span>;
    }

    // Rendered without a <Layout> provider — should get defaults from createContext
    render(<Orphan />);
    expect(screen.getByTestId("orphan")).toHaveTextContent("0");
  });
});
