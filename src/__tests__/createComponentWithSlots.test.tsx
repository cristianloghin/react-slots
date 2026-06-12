import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createComponentWithSlots } from "../withSlots";

const Card = createComponentWithSlots({
  Header: {},
  Body: { isRequired: true },
  Footer: { defaultContent: <span>default footer</span> },
  Tag: { multiple: true },
}).render(({ slots }) => (
  <div>
    <div data-testid="header">{slots.Header}</div>
    <div data-testid="body">{slots.Body}</div>
    <div data-testid="footer">{slots.Footer}</div>
    <div data-testid="tags">{slots.Tag}</div>
  </div>
));

describe("createComponentWithSlots", () => {
  it("renders slot content in the correct position", () => {
    render(
      <Card>
        <Card.Header>My Header</Card.Header>
        <Card.Body>My Body</Card.Body>
      </Card>
    );
    expect(screen.getByTestId("header")).toHaveTextContent("My Header");
    expect(screen.getByTestId("body")).toHaveTextContent("My Body");
  });

  it("renders defaultContent when slot is not filled", () => {
    render(
      <Card>
        <Card.Body>Body</Card.Body>
      </Card>
    );
    expect(screen.getByTestId("footer")).toHaveTextContent("default footer");
  });

  it("collects multiple slot instances into an array", () => {
    render(
      <Card>
        <Card.Body>Body</Card.Body>
        <Card.Tag>one</Card.Tag>
        <Card.Tag>two</Card.Tag>
        <Card.Tag>three</Card.Tag>
      </Card>
    );
    expect(screen.getByTestId("tags")).toHaveTextContent("onetwothree");
  });

  it("does not render unfilled optional slots", () => {
    render(
      <Card>
        <Card.Body>Body</Card.Body>
      </Card>
    );
    expect(screen.getByTestId("header")).toBeEmptyDOMElement();
  });

  it("logs an error when a required slot is not filled", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Card>{/* no Body */}</Card>);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Required slots missing")
    );
    errorSpy.mockRestore();
  });

  it("collects non-slot children separately", () => {
    const WithNonSlot = createComponentWithSlots({ Body: {} }).render(
      ({ slots, nonSlotChildren }) => (
        <div>
          <div data-testid="slot">{slots.Body}</div>
          <div data-testid="other">{nonSlotChildren}</div>
        </div>
      )
    );
    render(
      <WithNonSlot>
        <WithNonSlot.Body>slot content</WithNonSlot.Body>
        <span>stray child</span>
      </WithNonSlot>
    );
    expect(screen.getByTestId("slot")).toHaveTextContent("slot content");
    expect(screen.getByTestId("other")).toHaveTextContent("stray child");
  });
});
