import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createComponentWithSlots } from "../withSlots";

// Remote component that owns its own content — no knowledge of the parent layout
const RemoteHeader = ({ title }: { title: string }) => (
  <div data-testid="remote-header">{title}</div>
);

const RemoteItem = ({ label }: { label: string }) => (
  <div data-testid={`remote-item-${label}`}>{label}</div>
);

const Layout = createComponentWithSlots({
  Header: { isRequired: true },
  Body: {},
  Tag: { multiple: true },
}).render(({ slots }) => (
  <div>
    <div data-testid="header-slot">{slots.Header}</div>
    <div data-testid="body-slot">{slots.Body}</div>
    <div data-testid="tags-slot">{slots.Tag}</div>
  </div>
));

describe("asChild", () => {
  it("renders the child component in the slot position", () => {
    render(
      <Layout>
        <Layout.Header asChild>
          <RemoteHeader title="Hello from remote" />
        </Layout.Header>
      </Layout>
    );
    expect(screen.getByTestId("header-slot")).toHaveTextContent("Hello from remote");
    expect(screen.getByTestId("remote-header")).toBeInTheDocument();
  });

  it("slot is considered filled — defaultContent is not used", () => {
    const WithDefault = createComponentWithSlots({
      Header: { defaultContent: <span data-testid="default">fallback</span> },
    }).render(({ slots }) => <div>{slots.Header}</div>);

    render(
      <WithDefault>
        <WithDefault.Header asChild>
          <RemoteHeader title="provided" />
        </WithDefault.Header>
      </WithDefault>
    );
    expect(screen.queryByTestId("default")).not.toBeInTheDocument();
    expect(screen.getByTestId("remote-header")).toBeInTheDocument();
  });

  it("satisfies a required slot", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Layout>
        <Layout.Header asChild>
          <RemoteHeader title="provided" />
        </Layout.Header>
      </Layout>
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Required slots missing")
    );
    errorSpy.mockRestore();
  });

  it("works with multiple slots — each asChild is one instance", () => {
    render(
      <Layout>
        <Layout.Header asChild>
          <RemoteHeader title="h" />
        </Layout.Header>
        <Layout.Tag asChild>
          <RemoteItem label="alpha" />
        </Layout.Tag>
        <Layout.Tag asChild>
          <RemoteItem label="beta" />
        </Layout.Tag>
      </Layout>
    );
    expect(screen.getByTestId("remote-item-alpha")).toBeInTheDocument();
    expect(screen.getByTestId("remote-item-beta")).toBeInTheDocument();
    expect(screen.getByTestId("tags-slot").children).toHaveLength(2);
  });

  it("can be mixed with normal slot usage in multiple slots", () => {
    render(
      <Layout>
        <Layout.Header asChild>
          <RemoteHeader title="h" />
        </Layout.Header>
        <Layout.Tag asChild>
          <RemoteItem label="remote" />
        </Layout.Tag>
        <Layout.Tag>inline</Layout.Tag>
      </Layout>
    );
    expect(screen.getByTestId("remote-item-remote")).toBeInTheDocument();
    expect(screen.getByTestId("tags-slot")).toHaveTextContent("remoteinline");
  });

  it("logs an error when asChild child is not a valid React element", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Layout>
        <Layout.Header asChild>not an element</Layout.Header>
      </Layout>
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('asChild={true}')
    );
    errorSpy.mockRestore();
  });
});
