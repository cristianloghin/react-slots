import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { getSlotProps } from "../getSlotProps";
import { createComponentWithSlots } from "../withSlots";

type PanelProps = { open: boolean; label?: string; children?: ReactNode };

const Panel = ({ open, label, children }: PanelProps) => (
  <section data-open={open} aria-label={label}>
    {children}
  </section>
);

describe("getSlotProps — plain values", () => {
  it("selects from a single element", () => {
    expect(getSlotProps(<Panel open label="a" />, (p) => p.open)).toEqual([
      true,
    ]);
  });

  it("returns an empty array for null and undefined", () => {
    expect(getSlotProps(null, (p: PanelProps) => p.open)).toEqual([]);
    expect(getSlotProps(undefined, (p: PanelProps) => p.open)).toEqual([]);
  });

  it("selects from every element of an array, in order", () => {
    const slot = [
      <Panel key="a" open={false} label="a" />,
      <Panel key="b" open={true} label="b" />,
    ];
    expect(getSlotProps(slot, (p) => p.label)).toEqual(["a", "b"]);
    expect(getSlotProps(slot, (p) => p.open)).toEqual([false, true]);
  });

  it("returns an empty array for an empty array", () => {
    expect(getSlotProps([], (p: PanelProps) => p.open)).toEqual([]);
  });

  it("skips non-element entries", () => {
    const mixed = ["text", null, <Panel key="a" open label="a" />];
    expect(getSlotProps(mixed, (p: PanelProps) => p.open)).toEqual([true]);
  });
});

describe("getSlotProps — inside a render function", () => {
  const Layout = createComponentWithSlots({
    Form: { component: Panel, multiple: true },
  }).render(({ slots }) => {
    const isAnyOpen = getSlotProps(slots.Form, (p) => p.open).some(Boolean);
    return (
      <div>
        <div data-testid="state">{isAnyOpen ? "open" : "closed"}</div>
        {slots.Form}
      </div>
    );
  });

  it("reads the collected slot elements' props", () => {
    render(
      <Layout>
        <Layout.Form open={false} />
        <Layout.Form open={true} />
      </Layout>
    );
    expect(screen.getByTestId("state")).toHaveTextContent("open");
  });

  it("tracks prop changes across rerenders", () => {
    const { rerender } = render(
      <Layout>
        <Layout.Form open={false} />
        <Layout.Form open={false} />
      </Layout>
    );
    expect(screen.getByTestId("state")).toHaveTextContent("closed");

    rerender(
      <Layout>
        <Layout.Form open={false} />
        <Layout.Form open={true} />
      </Layout>
    );
    expect(screen.getByTestId("state")).toHaveTextContent("open");

    rerender(
      <Layout>
        <Layout.Form open={false} />
        <Layout.Form open={false} />
      </Layout>
    );
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });
});
