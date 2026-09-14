import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLayout, slot } from "../index";

// A hot reload re-evaluates a layout's module, which is the same as calling
// createLayout again with the same config, while the call sites that were not
// re-evaluated keep rendering the previous evaluation's fills.
const config = () => ({
  Header: { Title: slot(), Actions: slot({ multiple: true }) },
  Body: slot({ required: true }),
});
const make = () =>
  createLayout(config(), (_, { slots, children }) => (
    <div>
      <div data-testid="title">{slots.Header.Title}</div>
      <div data-testid="actions">{slots.Header.Actions}</div>
      <div data-testid="body">{slots.Body}</div>
      <div data-testid="rest">{children}</div>
    </div>
  ));

afterEach(() => vi.restoreAllMocks());

describe("fills across a re-evaluation of the same layout", () => {
  it("a layout collects fills made by an earlier evaluation of the same config", () => {
    const Before = make();
    const After = make();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <After>
        <Before.Header.Title>Title</Before.Header.Title>
        <Before.Header.Actions>one</Before.Header.Actions>
        <Before.Header.Actions>two</Before.Header.Actions>
        <Before.Body>Body</Before.Body>
      </After>,
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Title");
    expect(screen.getByTestId("actions")).toHaveTextContent("onetwo");
    expect(screen.getByTestId("body")).toHaveTextContent("Body");
    expect(screen.getByTestId("rest")).toBeEmptyDOMElement();
    expect(error).not.toHaveBeenCalled();
  });

  it("fills of a differently shaped layout with the same path stay plain children", () => {
    const Other = createLayout(
      { Header: { Title: slot() }, Body: slot() },
      (_, { slots }) => <div>{slots.Header.Title}</div>,
    );
    const Layout = make();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Layout>
        <Other.Header.Title>Stray</Other.Header.Title>
        <Layout.Body>Body</Layout.Body>
      </Layout>,
    );
    expect(screen.getByTestId("title")).toBeEmptyDOMElement();
    expect(screen.getByTestId("rest")).toHaveTextContent("Stray");
  });
});
