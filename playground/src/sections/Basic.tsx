import { createComponentWithSlots, injectSlotProps } from "@mikrostack/rst";

// ─── PageTitle — slotted component used as PageHeader's Title slot component ──

const PageTitle = createComponentWithSlots({
  Icon: {},
  Heading: { isRequired: true },
}).render<{ foo?: number }>(({ slots }) => (
  <div className="page-title">
    {slots.Icon && <div className="page-title__icon">{slots.Icon}</div>}
    <div className="page-title__heading">{slots.Heading}</div>
  </div>
));

// ─── PageHeader — slotted component used as Page's Header slot component ──────

const PageHeader = createComponentWithSlots({
  Title: { component: PageTitle, isRequired: true },
  Form: {},
}).render(({ slots }) => (
  <div className="page-header">
    <div className="page-header__title">
      {injectSlotProps(slots.Title, { foo: 78 })}
    </div>
    {slots.Form && <div className="page-header__form">{slots.Form}</div>}
  </div>
));

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = createComponentWithSlots({
  Header: { component: PageHeader },
  Body: { isRequired: true },
}).render(({ slots }) => (
  <div className="page">
    <div className="page__header">{slots.Header}</div>
    <div className="page__body">{slots.Body}</div>
  </div>
));

export function BasicSection() {
  return (
    <section>
      <h3>Normal — three levels of slot collection</h3>
      <p className="hint">
        <code>PageHeader</code> collects <code>Title</code> and{" "}
        <code>Form</code>. <code>PageTitle</code> collects <code>Icon</code> and{" "}
        <code>Heading</code>.
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
