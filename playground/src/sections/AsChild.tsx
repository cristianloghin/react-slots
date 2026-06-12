import { createComponentWithSlots } from "@mikrostack/rst";
import { useState } from "react";

// ─── Remote components ────────────────────────────────────────────────────────

// Fills Page.Header.Title via asChild — bypasses PageTitle, owns its own layout
function RemoteTitle({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="remote-title">
      <span className="remote-title__icon">★</span>
      {editing ? (
        <input
          className="remote-title__input"
          defaultValue={name}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <span className="remote-title__text" onClick={() => setEditing(true)}>
          {name} <em className="remote-title__hint">(click to edit)</em>
        </span>
      )}
    </div>
  );
}

// Fills Page.Header via asChild — bypasses PageHeader, owns its own layout
function RemoteHeader({ title }: { title: string }) {
  const [query, setQuery] = useState("");
  return (
    <div className="remote-page-header">
      <Page.Header.Title>
        <Page.Header.Title.Heading>{title}</Page.Header.Title.Heading>
      </Page.Header.Title>
      <Page.Header.Form>
        <input
          className="remote-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Remote search…"
        />
      </Page.Header.Form>
    </div>
  );
}

// ─── PageTitle — slotted component used as PageHeader's Title slot component ──

const PageTitle = createComponentWithSlots({
  Icon: {},
  Heading: { isRequired: true },
}).render(({ slots }) => (
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
    <div className="page-header__title">{slots.Title}</div>
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

export function AsChild() {
  return (
    <>
      {/* ── asChild on Page.Header.Title — bypasses PageTitle ───────────────── */}
      <section>
        <h3>
          asChild on <code>Page.Header.Title</code> — bypasses PageTitle
        </h3>
        <p className="hint">
          <code>RemoteTitle</code> fills the <code>Title</code> slot via{" "}
          <code>asChild</code>. <code>PageTitle</code> is bypassed.{" "}
          <code>PageHeader</code> still collects <code>Title</code> normally and
          applies its layout.
        </p>
        <Page>
          <Page.Header>
            <Page.Header.Title asChild>
              <RemoteTitle name="My Dashboard" />
            </Page.Header.Title>
            <Page.Header.Form>
              <input className="search-input" placeholder="Search…" />
            </Page.Header.Form>
          </Page.Header>
          <Page.Body>Page body content.</Page.Body>
        </Page>
      </section>

      {/* ── asChild on Page.Header — bypasses PageHeader ────────────────────── */}
      <section>
        <h3>
          asChild on <code>Page.Header</code> — bypasses PageHeader
        </h3>
        <p className="hint">
          <code>RemoteHeader</code> fills the <code>Header</code> slot via{" "}
          <code>asChild</code>. <code>PageHeader</code> is bypassed —{" "}
          <code>RemoteHeader</code> controls the layout.
        </p>
        <Page>
          <Page.Header asChild>
            <RemoteHeader title="Remote Dashboard" />
          </Page.Header>
          <Page.Body>Page body content.</Page.Body>
        </Page>
      </section>
    </>
  );
}
