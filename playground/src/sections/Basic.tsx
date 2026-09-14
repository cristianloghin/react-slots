import { createLayout, slot } from "@mikrostack/rst";

// ─── PageTitle — a layout used as PageHeader's Title slot component ──────────

const PageTitle = createLayout(
  { Icon: slot(), Heading: slot({ required: true }) },
  ({ foo }: { foo?: number }, { slots }) => (
    <div className="page-title" data-foo={foo}>
      {slots.Icon.when((icon) => icon && <div className="page-title__icon">{icon}</div>)}
      <div className="page-title__heading">{slots.Heading}</div>
    </div>
  ),
);

// ─── PageHeader — a layout used as Page's Header slot component ──────────────

const PageHeader = createLayout(
  { Title: slot({ component: PageTitle, required: true }), Form: slot() },
  (_, { slots }) => (
    <div className="page-header">
      <div className="page-header__title">
        {/* Inject a render-time prop into the collected Title fill */}
        {slots.Title.render({ foo: 78 })}
      </div>
      {slots.Form.when((form) => form && <div className="page-header__form">{form}</div>)}
    </div>
  ),
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = createLayout(
  { Header: slot({ component: PageHeader }), Body: slot({ required: true }) },
  (_, { slots }) => (
    <div className="page">
      <div className="page__header">{slots.Header}</div>
      <div className="page__body">{slots.Body}</div>
    </div>
  ),
);

export function BasicSection() {
  return (
    <section>
      <h3>Nested layouts — three levels of slot collection</h3>
      <p className="hint">
        <code>PageHeader</code> collects <code>Title</code> and <code>Form</code>.{" "}
        <code>PageTitle</code> collects <code>Icon</code> and <code>Heading</code>. The
        chained accessors come from the slot's <code>component</code>.
      </p>
      <Page>
        <Page.Header>
          <Page.Header.Title>
            <Page.Header.Title.Icon>⚡</Page.Header.Title.Icon>
            <Page.Header.Title.Heading>My Dashboard</Page.Header.Title.Heading>
          </Page.Header.Title>
          <Page.Header.Form>
            <input className="search-input" placeholder="Search…" />
          </Page.Header.Form>
        </Page.Header>
        <Page.Body>Page body content.</Page.Body>
      </Page>
    </section>
  );
}
