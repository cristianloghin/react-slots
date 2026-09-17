import { act, render, screen } from "@testing-library/react";
import { createRef, forwardRef, PropsWithChildren, ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLayout, portalFill, slot } from "../index";

afterEach(() => vi.restoreAllMocks());

const DialogBox = forwardRef<HTMLDivElement, PropsWithChildren<{ title: string }>>(
  function DialogBox({ title, children }, ref) {
    return (
      <div ref={ref} role="dialog" aria-label={title}>
        {children}
      </div>
    );
  },
);

// Mirrors a page layout: Dialog is a multiple portal slot, and the render
// function does not render `children`.
const Page = createLayout(
  { Dialog: slot({ portal: true, multiple: true, component: DialogBox }), Body: slot() },
  (_, { slots }) => (
    <div>
      <main data-testid="main">{slots.Body}</main>
      <div data-testid="dialogs">{slots.Dialog}</div>
    </div>
  ),
);

// A pre-composed dialog, written in its own file in real code.
const Dialog = portalFill(({ children, ...props }: PropsWithChildren<{ title: string }>) => (
  <Page.Dialog {...props}>
    <div className="wrapped">{children}</div>
  </Page.Dialog>
));

describe("portalFill", () => {
  it("is mounted as a registrar when placed directly under the layout", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Page>
        <Dialog title="one">first</Dialog>
        <Page.Body>body</Page.Body>
        <Dialog title="two">second</Dialog>
      </Page>,
    );
    expect(screen.getByTestId("dialogs")).toHaveTextContent("firstsecond");
    expect(screen.getByTestId("main")).toHaveTextContent("body");
    expect(screen.getByTestId("main")).not.toHaveTextContent("first");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("works the same deep inside a rendered slot", () => {
    render(
      <Page>
        <Page.Body>
          body
          <Dialog title="one">deep</Dialog>
        </Page.Body>
      </Page>,
    );
    expect(screen.getByTestId("dialogs")).toHaveTextContent("deep");
  });

  it("keeps its own state and re-registers on update", () => {
    const Counter = portalFill(({ title }: { title: string }) => {
      const [n, setN] = useState(0);
      return (
        <Page.Dialog title={title}>
          <button onClick={() => setN((c) => c + 1)}>count {n}</button>
        </Page.Dialog>
      );
    });
    render(
      <Page>
        <Counter title="c" />
        <Page.Body>body</Page.Body>
      </Page>,
    );
    act(() => screen.getByText("count 0").click());
    expect(screen.getByTestId("dialogs")).toHaveTextContent("count 1");
  });

  it("forwards a ref to the wrapped render", () => {
    const Reffed = portalFill<PropsWithChildren<{ title: string }>, HTMLDivElement>(
      ({ children, ...props }, ref) => (
        <Page.Dialog {...props} ref={ref}>
          {children}
        </Page.Dialog>
      ),
    );
    const ref = createRef<HTMLDivElement>();
    render(
      <Page>
        <Reffed title="r" ref={ref}>
          content
        </Reffed>
        <Page.Body>body</Page.Body>
      </Page>,
    );
    expect(ref.current?.getAttribute("role")).toBe("dialog");
  });

  it("still mounts under a layout with no portal slots, filling an ancestor", () => {
    const Inner = createLayout({ Body: slot() }, (_, { slots }) => (
      <section data-testid="inner">{slots.Body}</section>
    ));
    render(
      <Page>
        <Page.Body>
          <Inner>
            <Dialog title="one">from inner</Dialog>
            <Inner.Body>inner body</Inner.Body>
          </Inner>
        </Page.Body>
      </Page>,
    );
    expect(screen.getByTestId("dialogs")).toHaveTextContent("from inner");
    expect(screen.getByTestId("inner")).not.toHaveTextContent("from inner");
  });

  it("unregisters on unmount", () => {
    function Shell({ show }: { show: boolean }) {
      return (
        <Page>
          {show && <Dialog title="one">gone</Dialog>}
          <Page.Body>body</Page.Body>
        </Page>
      );
    }
    const { rerender } = render(<Shell show />);
    expect(screen.getByTestId("dialogs")).toHaveTextContent("gone");
    rerender(<Shell show={false} />);
    expect(screen.getByTestId("dialogs")).toBeEmptyDOMElement();
  });

  it("without portalFill, the same wrapper is dropped with an error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Plain({ children }: { children?: ReactNode }) {
      return <Page.Dialog title="p">{children}</Page.Dialog>;
    }
    render(
      <Page>
        <Plain>lost</Plain>
        <Page.Body>body</Page.Body>
      </Page>,
    );
    expect(screen.getByTestId("dialogs")).toBeEmptyDOMElement();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("<Plain>"));
  });
});
