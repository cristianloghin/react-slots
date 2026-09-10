import { render, screen } from "@testing-library/react";
import { ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLayout, slot } from "../index";

afterEach(() => vi.restoreAllMocks());

// ─── Fixture: three levels of layouts ────────────────────────────────────────

const PageTitle = createLayout(
  { Icon: slot(), Heading: slot({ required: true }) },
  (_, { slots }) => (
    <div className="title">
      {slots.Icon.when((i) => i && <span data-testid="icon">{i}</span>)}
      <span data-testid="heading">{slots.Heading}</span>
    </div>
  ),
);

const PageHeader = createLayout(
  { Title: slot({ component: PageTitle, required: true }), Form: slot() },
  (_, { slots }) => (
    <div data-testid="header">
      {slots.Title}
      {slots.Form.when((f) => f && <div data-testid="form">{f}</div>)}
    </div>
  ),
);

const Page = createLayout(
  { Header: slot({ component: PageHeader }), Body: slot({ required: true }) },
  (_, { slots }) => (
    <div>
      {slots.Header}
      <main data-testid="body">{slots.Body}</main>
    </div>
  ),
);

describe("nested layouts as slot components", () => {
  it("exposes the inner layout's fills on the outer fill", () => {
    render(
      <Page>
        <Page.Header>
          <Page.Header.Title>
            <Page.Header.Title.Icon>⚡</Page.Header.Title.Icon>
            <Page.Header.Title.Heading>Dash</Page.Header.Title.Heading>
          </Page.Header.Title>
          <Page.Header.Form>
            <input />
          </Page.Header.Form>
        </Page.Header>
        <Page.Body>b</Page.Body>
      </Page>,
    );
    expect(screen.getByTestId("icon")).toHaveTextContent("⚡");
    expect(screen.getByTestId("heading")).toHaveTextContent("Dash");
    expect(screen.getByTestId("form").querySelector("input")).not.toBeNull();
  });

  it("a fill renders its component standalone outside any layout", () => {
    render(
      <Page.Header.Title>
        <Page.Header.Title.Heading>alone</Page.Header.Title.Heading>
      </Page.Header.Title>,
    );
    expect(screen.getByTestId("heading")).toHaveTextContent("alone");
  });
});

describe("function children (split files)", () => {
  // Lives in "another file": receives the header's fills, never imports Page.
  function productHeader(h: typeof Page.Header, name: string) {
    return (
      <>
        <h.Title>
          <h.Title.Heading>{name}</h.Title.Heading>
        </h.Title>
        <h.Form>
          <input placeholder="search" />
        </h.Form>
      </>
    );
  }

  it("calls the function with the nested fills and collects the result", () => {
    render(
      <Page>
        <Page.Header>{(h) => productHeader(h, "Products")}</Page.Header>
        <Page.Body>b</Page.Body>
      </Page>,
    );
    expect(screen.getByTestId("heading")).toHaveTextContent("Products");
    expect(screen.getByPlaceholderText("search")).toBeInTheDocument();
  });

  it("allows hooks inside the function", () => {
    render(
      <Page>
        <Page.Header>
          {(h) => {
            const [n] = useState(3);
            return (
              <h.Title>
                <h.Title.Heading>count {n}</h.Title.Heading>
              </h.Title>
            );
          }}
        </Page.Header>
        <Page.Body>b</Page.Body>
      </Page>,
    );
    expect(screen.getByTestId("heading")).toHaveTextContent("count 3");
  });

  it("receives the fill itself, so the argument type is `typeof Layout.X`", () => {
    let received: unknown;
    const Layout = createLayout({ X: slot() }, (_, { slots }) => <div data-testid="x">{slots.X}</div>);
    render(
      <Layout>
        <Layout.X>
          {(x) => {
            received = x;
            return "content";
          }}
        </Layout.X>
      </Layout>,
    );
    expect(received).toBe(Layout.X);
    expect(screen.getByTestId("x")).toHaveTextContent("content");
  });

  it("cannot be combined with asChild", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Page>
        <Page.Header asChild>{() => <div>x</div>}</Page.Header>
        <Page.Body>b</Page.Body>
      </Page>,
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("cannot combine asChild"));
  });
});

describe("asChild", () => {
  const Layout = createLayout(
    {
      Header: slot({ required: true, fallback: <i>fb</i> }),
      Item: slot({ multiple: true }),
      Wrapped: slot({ component: ({ children }: { children?: ReactNode }) => <b data-testid="w">{children}</b> }),
    },
    (_, { slots }) => (
      <div>
        <div data-testid="header">{slots.Header}</div>
        <div data-testid="items">{slots.Item}</div>
        <div data-testid="wrapped">{slots.Wrapped}</div>
      </div>
    ),
  );

  it("renders the child directly in the slot position and satisfies required", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Layout>
        <Layout.Header asChild>
          <h1>remote</h1>
        </Layout.Header>
      </Layout>,
    );
    expect(screen.getByTestId("header").querySelector("h1")).toHaveTextContent("remote");
    expect(screen.getByTestId("header")).not.toHaveTextContent("fb");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("bypasses the slot's component", () => {
    render(
      <Layout>
        <Layout.Header>h</Layout.Header>
        <Layout.Wrapped asChild>
          <u>plain</u>
        </Layout.Wrapped>
      </Layout>,
    );
    expect(screen.queryByTestId("w")).toBeNull();
    expect(screen.getByTestId("wrapped").querySelector("u")).toHaveTextContent("plain");
  });

  it("counts each asChild fill as one instance of a multiple slot", () => {
    render(
      <Layout>
        <Layout.Header>h</Layout.Header>
        <Layout.Item asChild>
          <li>a</li>
        </Layout.Item>
        <Layout.Item>b</Layout.Item>
        <Layout.Item asChild>
          <li>c</li>
        </Layout.Item>
      </Layout>,
    );
    expect(screen.getByTestId("items")).toHaveTextContent("abc");
  });

  it("logs an error and drops the fill when the child is not an element", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Layout>
        <Layout.Header asChild>text</Layout.Header>
      </Layout>,
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("exactly one React element"));
  });
});
