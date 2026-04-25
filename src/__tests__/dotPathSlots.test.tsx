import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createComponentWithSlots } from "../withSlots";

// ─── Fixture ──────────────────────────────────────────────────────────────────

const Page = createComponentWithSlots({
  "Header.Title": {},
  "Header.Actions": { multiple: true },
  "Body": { isRequired: true },
}).render(({ slots }) => (
  <div>
    <div data-testid="title">{slots["Header.Title"]}</div>
    <div data-testid="actions">{slots["Header.Actions"]}</div>
    <div data-testid="body">{slots.Body}</div>
  </div>
));

describe("dot-path slot keys", () => {
  it("generates nested static properties on the component", () => {
    expect(typeof Page.Header.Title).toBe("function");
    expect(typeof Page.Header.Actions).toBe("function");
    expect(typeof Page.Body).toBe("function");
  });

  it("collects dot-path slot content into the correct slot", () => {
    render(
      <Page>
        <Page.Header.Title>My Title</Page.Header.Title>
        <Page.Body>Body content</Page.Body>
      </Page>
    );
    expect(screen.getByTestId("title")).toHaveTextContent("My Title");
    expect(screen.getByTestId("body")).toHaveTextContent("Body content");
  });

  it("collects multiple instances of a dot-path multiple slot", () => {
    render(
      <Page>
        <Page.Body>body</Page.Body>
        <Page.Header.Actions>Save</Page.Header.Actions>
        <Page.Header.Actions>Cancel</Page.Header.Actions>
      </Page>
    );
    expect(screen.getByTestId("actions")).toHaveTextContent("SaveCancel");
  });

  it("mix of dot-path and plain keys both work", () => {
    render(
      <Page>
        <Page.Header.Title>Mixed</Page.Header.Title>
        <Page.Body>plain</Page.Body>
      </Page>
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Mixed");
    expect(screen.getByTestId("body")).toHaveTextContent("plain");
  });

  it("logs required-slot error when a dot-path required slot is missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Page>{/* no Body */}</Page>);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Required slots missing"));
    errorSpy.mockRestore();
  });

  it("asChild works on a dot-path slot", () => {
    const Remote = () => <span data-testid="remote">remote</span>;
    render(
      <Page>
        <Page.Header.Title asChild>
          <Remote />
        </Page.Header.Title>
        <Page.Body>body</Page.Body>
      </Page>
    );
    expect(screen.getByTestId("remote")).toBeInTheDocument();
    expect(screen.getByTestId("title")).toContainElement(screen.getByTestId("remote"));
  });

  it("three-level dot-path key generates correct nested accessor", () => {
    const Deep = createComponentWithSlots({
      "A.B.C": {},
    }).render(({ slots }) => (
      <div data-testid="deep">{slots["A.B.C"]}</div>
    ));

    expect(typeof Deep.A.B.C).toBe("function");

    render(
      <Deep>
        <Deep.A.B.C>deep value</Deep.A.B.C>
      </Deep>
    );
    expect(screen.getByTestId("deep")).toHaveTextContent("deep value");
  });
});
