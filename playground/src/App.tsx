import {
  createComponentWithSlots,
  defineSlotGroup,
  useSlotContext,
} from "@mikrostack/rst";
import React, { useState } from "react";
import { AsChild } from "./sections/AsChild";
import { BasicSection } from "./sections/Basic";
import { TagListSection } from "./sections/TagList";
import { WithProps } from "./sections/WithProps";
import "./styles.css";

// ─── Basic card ───────────────────────────────────────────────────────────────

const Card = createComponentWithSlots({
  Header: {},
  Body: { isRequired: true },
  Footer: { defaultContent: <em>No footer provided</em> },
  Tag: { multiple: true },
}).render(({ slots }) => (
  <div className="card">
    {slots.Header && <div className="card__header">{slots.Header}</div>}
    <div className="card__body">{slots.Body}</div>
    {slots.Tag.length > 0 && <div className="card__tags">{slots.Tag}</div>}
    <div className="card__footer">{slots.Footer}</div>
  </div>
));

const Badge = ({
  label,
  color = "#eee",
}: {
  label: string;
  color?: string;
}) => (
  <span className="badge" style={{ background: color }}>
    {label}
  </span>
);

// ─── Slot context demo ───────────────────────────────────────────────────────

const Panel = createComponentWithSlots(
  {
    Header: {},
    Trigger: {},
    Body: { isRequired: true },
  },
  {
    context: {
      open: false,
      toggle: () => {},
    },
  },
).render(({ slots, provideContext }) => {
  const [open, setOpen] = useState(false);
  provideContext({ open, toggle: () => setOpen((o) => !o) });
  return (
    <div className="panel">
      <div className="panel__bar">
        <div className="panel__header">{slots.Header}</div>
        <div className="panel__trigger">{slots.Trigger}</div>
      </div>
      {open && <div className="panel__body">{slots.Body}</div>}
    </div>
  );
});

// Reads `open` via selector — re-renders only when open changes
function PanelStatusBadge() {
  const open = useSlotContext(Panel, (s) => s.open);
  return (
    <span
      className={`panel-badge ${open ? "panel-badge--open" : "panel-badge--closed"}`}
    >
      {open ? "open" : "closed"}
    </span>
  );
}

// Reads both `open` and `toggle` via full-shape overload
function PanelToggleButton() {
  const { open, toggle } = useSlotContext(Panel);
  return (
    <button className="panel-btn" onClick={toggle}>
      {open ? "▲ Collapse" : "▼ Expand"}
    </button>
  );
}

// ─── Dot-path slot keys demo ─────────────────────────────────────────────────

// Plain component — receives an `icon` prop plus children
function PostTitle({
  icon,
  children,
}: {
  icon?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="post-title">
      {icon && <span className="post-title__icon">{icon}</span>}
      <span className="post-title__text">{children}</span>
    </div>
  );
}

// Slotted component — has its own Lead / Body slots
const PostContent = createComponentWithSlots({
  Lead: {},
  Body: { isRequired: true },
}).render(({ slots }) => (
  <div className="post-content">
    {slots.Lead && <p className="post-content__lead">{slots.Lead}</p>}
    <div className="post-content__body">{slots.Body}</div>
  </div>
));

const Post = createComponentWithSlots({
  "Header.Title": { component: PostTitle },
  "Header.Meta": {},
  "Body.Content": { component: PostContent, isRequired: true },
  "Body.Aside": {},
  "Footer.Actions": { multiple: true },
}).render(({ slots }) => (
  <div className="post">
    <header className="post__header">
      <div className="post__title-wrap">{slots["Header.Title"]}</div>
      <div className="post__meta">{slots["Header.Meta"]}</div>
    </header>
    <div className="post__body">
      <div className="post__content">{slots["Body.Content"]}</div>
      {slots["Body.Aside"] && (
        <aside className="post__aside">{slots["Body.Aside"]}</aside>
      )}
    </div>
    {(slots["Footer.Actions"] as React.ReactNode[]).length > 0 && (
      <footer className="post__footer">{slots["Footer.Actions"]}</footer>
    )}
  </div>
));

// ─── defineSlotGroup demo ────────────────────────────────────────────────────

const articleHeaderGroup = defineSlotGroup(
  "Header",
  { Title: {}, Byline: {}, Tags: { multiple: true } },
  ({ slots }) => (
    <div className="article-header">
      <h2 className="article-header__title">{slots["Header.Title"]}</h2>
      {slots["Header.Byline"] && (
        <p className="article-header__byline">{slots["Header.Byline"]}</p>
      )}
      {(slots["Header.Tags"] as React.ReactNode[]).length > 0 && (
        <div className="article-header__tags">{slots["Header.Tags"]}</div>
      )}
    </div>
  ),
);

const Article = createComponentWithSlots({
  ...articleHeaderGroup.config(),
  Body: { isRequired: true },
  Footer: {},
}).render(({ slots }) => (
  <article className="article">
    {articleHeaderGroup.render(slots)}
    <div className="article__body">{slots.Body}</div>
    {slots.Footer && (
      <footer className="article__footer">{slots.Footer}</footer>
    )}
  </article>
));

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="app">
      <h2>RST Playground</h2>
      <BasicSection />
      <AsChild />
      <WithProps />
      <TagListSection />

      {/* ── Basic card ──────────────────────────────────────────────────────── */}
      <section>
        <h3>Card — basic slots</h3>
        <Card>
          <Card.Header>My Card Title</Card.Header>
          <Card.Body>This is the card body content.</Card.Body>
          <Card.Tag>
            <Badge label="react" color="#61dafb33" />
          </Card.Tag>
          <Card.Tag>
            <Badge label="slots" color="#a78bfa33" />
          </Card.Tag>
          <Card.Footer>Updated just now</Card.Footer>
        </Card>
        <Card>
          <Card.Body>Card with default footer and no header.</Card.Body>
        </Card>
      </section>

      {/* ── Dot-path slot keys ──────────────────────────────────────────────── */}
      <section>
        <h3>Dot-path slot keys</h3>
        <p className="hint">
          The config uses <code>'Header.Title'</code>,{" "}
          <code>'Body.Content'</code>, etc. RST splits each key and attaches
          nested accessors automatically — no extra wiring needed.
        </p>
        <Post>
          <Post.Header.Title icon="📝">
            Understanding React Slots
          </Post.Header.Title>
          <Post.Header.Meta>April 2025 · 5 min read</Post.Header.Meta>
          <Post.Body.Content>
            <Post.Body.Content.Lead>
              Dot-path keys namespace your slots without nesting components.
            </Post.Body.Content.Lead>
            <Post.Body.Content.Body>
              <p>
                The full slot key is a flat string internally. The nested
                accessor is generated automatically from the dots in the key
                name.
              </p>
            </Post.Body.Content.Body>
          </Post.Body.Content>
          <Post.Body.Aside>
            <Badge label="featured" color="#fde68a33" />
          </Post.Body.Aside>
          <Post.Footer.Actions>
            <button className="panel-btn">Like</button>
          </Post.Footer.Actions>
          <Post.Footer.Actions>
            <button className="panel-btn">Share</button>
          </Post.Footer.Actions>
        </Post>
      </section>

      {/* ── defineSlotGroup ─────────────────────────────────────────────────── */}
      <section>
        <h3>defineSlotGroup — reusable slot group</h3>
        <p className="hint">
          <code>articleHeaderGroup</code> bundles <code>Header.Title</code>,{" "}
          <code>Header.Byline</code>, and <code>Header.Tags</code> into a
          reusable unit. The group is spread into <code>Article</code>'s config
          and rendered via <code>articleHeaderGroup.render(slots)</code>.
        </p>
        <Article>
          <Article.Header.Title>How RST Works</Article.Header.Title>
          <Article.Header.Byline>
            By Cristian Loghin · April 2025
          </Article.Header.Byline>
          <Article.Header.Tags>
            <Badge label="react" color="#61dafb33" />
          </Article.Header.Tags>
          <Article.Header.Tags>
            <Badge label="slots" color="#a78bfa33" />
          </Article.Header.Tags>
          <Article.Body>
            <p>
              This is the article body. The header was rendered by the group's
              own render function.
            </p>
          </Article.Body>
          <Article.Footer>Published in the RST blog.</Article.Footer>
        </Article>
      </section>

      {/* ── useSlotContext ───────────────────────────────────────────────────── */}
      <section>
        <h3>useSlotContext — typed slot context</h3>
        <p className="hint">
          <code>PanelStatusBadge</code> uses the selector overload and
          re-renders only when <code>open</code> changes.{" "}
          <code>PanelToggleButton</code> uses the full-shape overload to read
          both <code>open</code> and <code>toggle</code>. Neither component
          knows anything about <code>Panel</code>'s internals.
        </p>
        <Panel>
          <Panel.Header>
            Settings <PanelStatusBadge />
          </Panel.Header>
          <Panel.Trigger>
            <PanelToggleButton />
          </Panel.Trigger>
          <Panel.Body>
            <p>This content is only visible when the panel is open.</p>
          </Panel.Body>
        </Panel>
      </section>
    </div>
  );
}
