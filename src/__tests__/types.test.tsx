/**
 * Type-level checks. These run under `tsc` (vitest transpiles without
 * type-checking), so the assertions are `expectTypeOf` calls plus deliberate
 * `@ts-expect-error` lines. The single runtime test keeps the file in the suite.
 */
import { createRef, forwardRef, ReactNode, Ref, useRef } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createLayout, createSlotContext, slot, useSlotContext } from "../index";

function TitleSlot({ level, children }: { level: 1 | 2; children?: ReactNode }) {
  const Tag = `h${level}` as const;
  return <Tag>{children}</Tag>;
}

const Item = forwardRef<HTMLLIElement, { tone?: string; children?: ReactNode }>(
  ({ tone, children }, ref) => (
    <li ref={ref} data-tone={tone}>
      {children}
    </li>
  ),
);

function Sidebar({ side, children }: { side: "left" | "right"; children?: ReactNode }) {
  return <aside data-side={side}>{children}</aside>;
}

const Ctx = createSlotContext({ open: false, toggle: () => {} });

const Header = createLayout(
  { Title: slot({ component: TitleSlot }), Actions: slot({ multiple: true }) },
  (_, { slots }) => (
    <header>
      {slots.Title}
      {slots.Actions}
    </header>
  ),
);

const Page = createLayout(
  {
    Header: slot({ component: Header }),
    Nav: { Primary: slot(), Secondary: slot({ multiple: true }) },
    Left: slot({ component: Sidebar, props: { side: "left" } }),
    Items: slot({ component: Item, multiple: true }),
    Toolbar: slot({ portal: true }),
    Body: slot({ required: true, fallback: <p>empty</p> }),
  },
  { context: Ctx },
  (props: { className?: string; ref?: Ref<HTMLDivElement> }, { slots, children, provide }) => {
    provide({ open: true, toggle: () => {} });

    // Handle shapes follow the config.
    expectTypeOf(slots.Header.filled).toEqualTypeOf<boolean>();
    expectTypeOf(slots.Header.props).toMatchTypeOf<
      { children?: ReactNode } | undefined
    >();
    expectTypeOf(slots.Nav.filled).toEqualTypeOf<boolean>();
    expectTypeOf(slots.Nav.Secondary.props).toEqualTypeOf<{ children?: ReactNode }[]>();
    expectTypeOf(slots.Items.props).toEqualTypeOf<
      ({ tone?: string; children?: ReactNode } & React.RefAttributes<HTMLLIElement>)[]
    >();
    expectTypeOf(slots.Toolbar.when).toBeFunction();
    // @ts-expect-error portal presence is not knowable synchronously
    slots.Toolbar.filled;
    expectTypeOf(children).toEqualTypeOf<ReactNode[]>();
    expectTypeOf(props.className).toEqualTypeOf<string | undefined>();

    // Every handle renders directly.
    return (
      <div ref={props.ref} className={props.className}>
        {slots.Header}
        {slots.Nav}
        {slots.Left.render({ side: "right" })}
        {slots.Items}
        {slots.Toolbar.when((c) => c && <nav>{c}</nav>)}
        {slots.Body}
        {children}
      </div>
    );
  },
);

const NoProps = createLayout({ Body: slot() }, (_, { slots }) => <div>{slots.Body}</div>);

describe("types", () => {
  it("compiles the fixtures", () => {
    // Nested accessors, through a component-backed slot and through a group.
    expectTypeOf(Page.Header.Title).toBeFunction();
    expectTypeOf(Page.Nav.Primary).toBeFunction();

    // Fill props come from the slot's component.
    const ok = (
      <Page className="x" ref={createRef<HTMLDivElement>()}>
        <Page.Header>
          <Page.Header.Title level={1}>t</Page.Header.Title>
          <Page.Header.Actions>a</Page.Header.Actions>
        </Page.Header>
        <Page.Header>{(h) => <h.Title level={2}>split</h.Title>}</Page.Header>
        <Page.Nav.Primary>p</Page.Nav.Primary>
        <Page.Left>bound side is optional</Page.Left>
        <Page.Left side="right">but can be overridden</Page.Left>
        <Page.Items ref={createRef<HTMLLIElement>()} tone="a">
          i
        </Page.Items>
        <Page.Toolbar>t</Page.Toolbar>
        <Page.Body asChild>
          <p>b</p>
        </Page.Body>
        <NoProps>
          <NoProps.Body>b</NoProps.Body>
        </NoProps>
      </Page>
    );
    expect(ok).toBeTruthy();

    // @ts-expect-error level is required by TitleSlot
    <Page.Header.Title>t</Page.Header.Title>;
    // @ts-expect-error unknown prop on the layout
    <Page nope="x" />;
    // @ts-expect-error a group is not a component
    <Page.Nav />;
    // @ts-expect-error the ref element type comes from the props annotation
    <Page ref={createRef<HTMLSpanElement>()} />;
    // @ts-expect-error props not declared on a layout without a props annotation
    <NoProps className="x" />;

    // Context reads are typed from the context, with and without a selector.
    function Reader() {
      const open = useSlotContext(Ctx, (s) => s.open);
      const all = useSlotContext(Ctx);
      expectTypeOf(open).toEqualTypeOf<boolean>();
      expectTypeOf(all.toggle).toEqualTypeOf<() => void>();
      // @ts-expect-error a layout is not a context
      useSlotContext(Page);
      return null;
    }
    expect(Reader).toBeTypeOf("function");

    // The forwarded ref inside the render function accepts the declared element.
    function Consumer() {
      const ref = useRef<HTMLDivElement>(null);
      return <Page ref={ref}>{null}</Page>;
    }
    expect(Consumer).toBeTypeOf("function");
  });
});
