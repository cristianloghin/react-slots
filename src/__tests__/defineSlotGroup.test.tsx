import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createComponentWithSlots } from "../withSlots";
import { defineSlotGroup } from "../defineSlotGroup";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const headerGroup = defineSlotGroup(
  "Header",
  { Title: {}, Actions: { multiple: true } },
  ({ slots }) => (
    <header data-testid="header">
      <span data-testid="group-title">{slots["Header.Title"]}</span>
      <div data-testid="group-actions">{slots["Header.Actions"]}</div>
    </header>
  ),
);

const Page = createComponentWithSlots({
  ...headerGroup.config(),
  Body: { isRequired: true },
}).render(({ slots }) => (
  <div>
    {headerGroup.render(slots)}
    <main data-testid="body">{slots.Body}</main>
  </div>
));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("defineSlotGroup", () => {
  it("config() returns prefixed slot config keys", () => {
    const config = headerGroup.config();
    expect(Object.keys(config)).toContain("Header.Title");
    expect(Object.keys(config)).toContain("Header.Actions");
  });

  it("renders group slots via render(slots)", () => {
    render(
      <Page>
        <Page.Header.Title>Group Title</Page.Header.Title>
        <Page.Body>body</Page.Body>
      </Page>
    );
    expect(screen.getByTestId("group-title")).toHaveTextContent("Group Title");
    expect(screen.getByTestId("body")).toHaveTextContent("body");
  });

  it("multiple slots within group collect correctly", () => {
    render(
      <Page>
        <Page.Body>body</Page.Body>
        <Page.Header.Actions>Save</Page.Header.Actions>
        <Page.Header.Actions>Cancel</Page.Header.Actions>
      </Page>
    );
    expect(screen.getByTestId("group-actions")).toHaveTextContent("SaveCancel");
  });

  it("group renders its container element", () => {
    render(
      <Page>
        <Page.Header.Title>T</Page.Header.Title>
        <Page.Body>b</Page.Body>
      </Page>
    );
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("two independent groups spread into the same component without conflict", () => {
    const footerGroup = defineSlotGroup(
      "Footer",
      { Links: {}, Copyright: {} },
      ({ slots }) => (
        <footer data-testid="footer">
          <span data-testid="footer-links">{slots["Footer.Links"]}</span>
          <span data-testid="footer-copyright">{slots["Footer.Copyright"]}</span>
        </footer>
      ),
    );

    const Layout = createComponentWithSlots({
      ...headerGroup.config(),
      ...footerGroup.config(),
    }).render(({ slots }) => (
      <div>
        {headerGroup.render(slots)}
        {footerGroup.render(slots)}
      </div>
    ));

    render(
      <Layout>
        <Layout.Header.Title>H</Layout.Header.Title>
        <Layout.Footer.Links>Links</Layout.Footer.Links>
        <Layout.Footer.Copyright>© 2025</Layout.Footer.Copyright>
      </Layout>
    );

    expect(screen.getByTestId("group-title")).toHaveTextContent("H");
    expect(screen.getByTestId("footer-links")).toHaveTextContent("Links");
    expect(screen.getByTestId("footer-copyright")).toHaveTextContent("© 2025");
  });
});
