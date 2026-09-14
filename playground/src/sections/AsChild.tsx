import { createLayout, slot } from "@mikrostack/rst";
import { useState } from "react";

// ─── PageTitle — a layout used as PageHeader's Title slot component ──────────

const PageTitle = createLayout(
  { Icon: slot(), Heading: slot({ required: true }) },
  (_, { slots }) => (
    <div className="page-title">
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
      <div className="page-header__title">{slots.Title}</div>
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

// ─── "Another file": fills the header without importing Page ─────────────────
//
// A function child receives the fill itself, so the nested fills are addressed
// through the argument. Hooks are allowed: it runs during the fill's render.

function productHeader(h: typeof Page.Header, name: string) {
  const [query, setQuery] = useState("");
  return (
    <>
      <h.Title>
        <h.Title.Icon>★</h.Title.Icon>
        <h.Title.Heading>{name}</h.Title.Heading>
      </h.Title>
      <h.Form>
        <input
          className="remote-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Remote search…"
        />
      </h.Form>
    </>
  );
}

// ─── Remote component — owns its own layout, replaces PageTitle via asChild ──

function RemoteTitle({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="remote-title">
      <span className="remote-title__icon">★</span>
      {editing ? (
        <input className="remote-title__input" defaultValue={name} onBlur={() => setEditing(false)} autoFocus />
      ) : (
        <span className="remote-title__text" onClick={() => setEditing(true)}>
          {name} <em className="remote-title__hint">(click to edit)</em>
        </span>
      )}
    </div>
  );
}

export function AsChild() {
  return (
    <>
      <section>
        <h3>Function child — a header written in another file</h3>
        <p className="hint">
          <code>productHeader</code> never imports <code>Page</code>: it receives{" "}
          <code>Page.Header</code> as its argument and returns the nested fills.{" "}
          <code>PageHeader</code> still collects them and applies its layout.
        </p>
        <Page>
          <Page.Header>{(h) => productHeader(h, "Remote Dashboard")}</Page.Header>
          <Page.Body>Page body content.</Page.Body>
        </Page>
      </section>

      <section>
        <h3>
          asChild on <code>Page.Header.Title</code> — replaces PageTitle
        </h3>
        <p className="hint">
          <code>RemoteTitle</code> fills the <code>Title</code> slot via <code>asChild</code>,
          so <code>PageTitle</code>'s chrome is bypassed and the remote component owns the
          markup. <code>PageHeader</code> still collects <code>Title</code> normally.
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
    </>
  );
}
