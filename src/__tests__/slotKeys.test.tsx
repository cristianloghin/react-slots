import { render, screen } from "@testing-library/react";
import { ReactNode, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { createLayout, slot } from "../index";

/**
 * A handle keys every node it emits by the slot's own id and the role the node
 * plays for it. Both halves earn their place, and each has a test below.
 *
 * The id, because `render` and `when` hand their result back to the layout
 * author, who places it among siblings the layout owns. Without a per-slot id
 * two slots placed side by side would share one key, and React would resolve
 * that by losing track of one of them and stranding its DOM.
 *
 * The role, because a slot swapping between its fill and its fallback should
 * rebuild rather than reuse whatever was in that position.
 *
 * The id must also be fixed for the layout's lifetime. Derived per render, it
 * would rebuild the slot's subtree on every pass.
 */
function keyWarnings(run: () => void): string[] {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    run();
    // Read before restoring: mockRestore also resets the recorded calls.
    return spy.mock.calls
      .map((call) => call.map((part) => String(part)).join(" "))
      .filter((message) => /same key|unique .?key/i.test(message));
  } finally {
    spy.mockRestore();
  }
}

const Box = ({ size, children }: { size?: string; children?: ReactNode }) => (
  <i data-size={size}>{children}</i>
);

let mounts = 0;
function Probe({ label }: { label?: string }) {
  useEffect(() => {
    mounts++;
  }, []);
  return <b data-testid="probe">{label}</b>;
}

describe("a slot's key is unique to that slot", () => {
  it("does not collide for two single slots rendered as siblings", () => {
    const Layout = createLayout(
      { A: slot({ component: Box }), B: slot({ component: Box }) },
      (_, { slots }) => (
        <div>
          {slots.A.render({ size: "sm" })}
          {slots.B.render({ size: "sm" })}
        </div>
      ),
    );
    expect(
      keyWarnings(() =>
        render(
          <Layout>
            <Layout.A>a</Layout.A>
            <Layout.B>b</Layout.B>
          </Layout>,
        ),
      ),
    ).toEqual([]);
  });

  it("does not collide for two multiple slots rendered as siblings", () => {
    const Layout = createLayout(
      {
        A: slot({ component: Box, multiple: true }),
        B: slot({ component: Box, multiple: true }),
      },
      (_, { slots }) => (
        <div>
          {slots.A.render({ size: "sm" })}
          {slots.B.render({ size: "sm" })}
        </div>
      ),
    );
    expect(
      keyWarnings(() =>
        render(
          <Layout>
            <Layout.A>a1</Layout.A>
            <Layout.A>a2</Layout.A>
            <Layout.B>b1</Layout.B>
            <Layout.B>b2</Layout.B>
          </Layout>,
        ),
      ),
    ).toEqual([]);
  });

  it("does not collide for two groups wrapped with when() as siblings", () => {
    const Layout = createLayout(
      { Left: { A: slot() }, Right: { B: slot() } },
      (_, { slots }) => (
        <div>
          {slots.Left.when((content) => content)}
          {slots.Right.when((content) => content)}
        </div>
      ),
    );
    expect(
      keyWarnings(() =>
        render(
          <Layout>
            <Layout.Left.A>a</Layout.Left.A>
            <Layout.Right.B>b</Layout.Right.B>
          </Layout>,
        ),
      ),
    ).toEqual([]);
  });

  it("does not collide for two portal slots wrapped with when() as siblings", () => {
    const Shell = createLayout(
      { Top: slot({ portal: true }), Bottom: slot({ portal: true }) },
      (_, { slots }) => (
        <div>
          {slots.Top.when((content) => content)}
          {slots.Bottom.when((content) => content)}
        </div>
      ),
    );
    expect(
      keyWarnings(() =>
        render(
          <Shell>
            <Shell.Top>top</Shell.Top>
            <Shell.Bottom>bottom</Shell.Bottom>
          </Shell>,
        ),
      ),
    ).toEqual([]);
  });

  it("strands no DOM when a slot alternates between iteration and render()", () => {
    const Layout = createLayout(
      { A: slot({ component: Box }), B: slot({ component: Box }) },
      ({ condensed = false }: { condensed?: boolean }, { slots }) => (
        <div data-testid="row">
          {condensed ? (
            <>
              {slots.A.render({ size: "sm" })}
              {slots.B.render({ size: "sm" })}
            </>
          ) : (
            <>
              {slots.A}
              {slots.B}
            </>
          )}
        </div>
      ),
    );
    const view = (condensed: boolean) => (
      <Layout condensed={condensed}>
        <Layout.A>a</Layout.A>
        <Layout.B>b</Layout.B>
      </Layout>
    );

    const { rerender } = render(view(false));
    expect(screen.getByTestId("row").children).toHaveLength(2);
    for (let cycle = 0; cycle < 3; cycle++) {
      rerender(view(true));
      expect(screen.getByTestId("row").children).toHaveLength(2);
      rerender(view(false));
      expect(screen.getByTestId("row").children).toHaveLength(2);
    }
  });
});

describe("a slot's key separates its fill from its fallback", () => {
  it("rebuilds when the slot swaps between them", () => {
    // The fill is given with asChild, so the collected element is the child
    // itself rather than the slot's wrapper. Both sides of the swap are then
    // the same component type, which leaves the key as the only thing that can
    // tell them apart. Without asChild the wrapper differs from the fallback
    // anyway, and React would rebuild on type alone.
    const Layout = createLayout(
      { Slot: slot({ fallback: <Probe label="fallback" /> }) },
      (_, { slots }) => <div>{slots.Slot.render({})}</div>,
    );
    mounts = 0;

    const { rerender } = render(<Layout />);
    expect(screen.getByTestId("probe").textContent).toBe("fallback");
    expect(mounts).toBe(1);

    rerender(
      <Layout>
        <Layout.Slot asChild>
          <Probe label="fill" />
        </Layout.Slot>
      </Layout>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("fill");
    expect(mounts).toBe(2);
  });
});

describe("a slot's key is fixed for the life of the layout", () => {
  it("keeps the slot's subtree across ordinary re-renders", () => {
    const Layout = createLayout(
      { Slot: slot({ component: Probe }) },
      ({ tick = 0 }: { tick?: number }, { slots }) => (
        <div data-tick={tick}>{slots.Slot.render({})}</div>
      ),
    );
    const view = (tick: number) => (
      <Layout tick={tick}>
        <Layout.Slot label="fill" />
      </Layout>
    );
    mounts = 0;

    const { rerender } = render(view(0));
    const node = screen.getByTestId("probe");
    rerender(view(1));
    rerender(view(2));

    // A key derived per render would have remounted this twice over.
    expect(screen.getByTestId("probe")).toBe(node);
    expect(mounts).toBe(1);
  });
});
