import { createLayout, createSlotContext, slot, useSlotContext } from "@mikrostack/rst";
import React, { useState } from "react";
import { AsChild } from "./sections/AsChild";
import { BasicSection } from "./sections/Basic";
import { PortalRouter } from "./sections/PortalRouter";
import { TagListSection } from "./sections/TagList";
import { WithProps } from "./sections/WithProps";
import "./styles.css";

// ─── Basic card ───────────────────────────────────────────────────────────────

const Card = createLayout(
  {
    Header: slot(),
    Body: slot({ required: true }),
    Footer: slot({ fallback: <em>No footer provided</em> }),
    Tag: slot({ multiple: true }),
  },
  (_, { slots }) => (
    <div className="card">
      {slots.Header.when((h) => h && <div className="card__header">{h}</div>)}
      <div className="card__body">{slots.Body}</div>
      {slots.Tag.when((t) => t && <div className="card__tags">{t}</div>)}
      <div className="card__footer">{slots.Footer}</div>
    </div>
  ),
);

const Badge = ({ label, color = "#eee" }: { label: string; color?: string }) => (
  <span className="badge" style={{ background: color }}>
    {label}
  </span>
);

// ─── Slot context demo ───────────────────────────────────────────────────────

// A leaf module both the layout and its fills can import.
const PanelContext = createSlotContext({ open: false, toggle: () => {} });

const Panel = createLayout(
  { Header: slot(), Trigger: slot(), Body: slot({ required: true }) },
  { context: PanelContext },
  (_, { slots, provide }) => {
    const [open, setOpen] = useState(false);
    provide({ open, toggle: () => setOpen((o) => !o) });
    return (
      <div className="panel">
        <div className="panel__bar">
          <div className="panel__header">{slots.Header}</div>
          <div className="panel__trigger">{slots.Trigger}</div>
        </div>
        {open && <div className="panel__body">{slots.Body}</div>}
      </div>
    );
  },
);

// Reads `open` via selector — re-renders only when open changes
function PanelStatusBadge() {
  const open = useSlotContext(PanelContext, (s) => s.open);
  return (
    <span className={`panel-badge ${open ? "panel-badge--open" : "panel-badge--closed"}`}>
      {open ? "open" : "closed"}
    </span>
  );
}

// Reads both `open` and `toggle` via the full-shape overload
function PanelToggleButton() {
  const { open, toggle } = useSlotContext(PanelContext);
  return (
    <button className="panel-btn" onClick={toggle}>
      {open ? "▲ Collapse" : "▼ Expand"}
    </button>
  );
}

// ─── Groups demo ─────────────────────────────────────────────────────────────

function PostTitle({ icon, children }: { icon?: string; children?: React.ReactNode }) {
  return (
    <div className="post-title">
      {icon && <span className="post-title__icon">{icon}</span>}
      <span className="post-title__text">{children}</span>
    </div>
  );
}

const PostContent = createLayout(
  { Lead: slot(), Body: slot({ required: true }) },
  (_, { slots }) => (
    <div className="post-content">
      {slots.Lead.when((l) => l && <p className="post-content__lead">{l}</p>)}
      <div className="post-content__body">{slots.Body}</div>
    </div>
  ),
);

const Post = createLayout(
  {
    Header: { Title: slot({ component: PostTitle }), Meta: slot() },
    Body: { Content: slot({ component: PostContent, required: true }), Aside: slot() },
    Footer: { Actions: slot({ multiple: true }) },
  },
  (_, { slots }) => (
    <div className="post">
      <header className="post__header">
        <div className="post__title-wrap">{slots.Header.Title}</div>
        <div className="post__meta">{slots.Header.Meta}</div>
      </header>
      <div className="post__body">
        <div className="post__content">{slots.Body.Content}</div>
        {slots.Body.Aside.when((a) => a && <aside className="post__aside">{a}</aside>)}
      </div>
      {slots.Footer.when((f) => f && <footer className="post__footer">{f}</footer>)}
    </div>
  ),
);

// ─── Shared group demo ───────────────────────────────────────────────────────

// A group is a plain object: define it once, spread it into any layout.
const articleHeader = {
  Title: slot(),
  Byline: slot(),
  Tags: slot({ multiple: true }),
};

const Article = createLayout(
  { Header: articleHeader, Body: slot({ required: true }), Footer: slot() },
  (_, { slots }) => (
    <article className="article">
      <div className="article-header">
        <h2 className="article-header__title">{slots.Header.Title}</h2>
        {slots.Header.Byline.when((b) => b && <p className="article-header__byline">{b}</p>)}
        {slots.Header.Tags.when((t) => t && <div className="article-header__tags">{t}</div>)}
      </div>
      <div className="article__body">{slots.Body}</div>
      {slots.Footer.when((f) => f && <footer className="article__footer">{f}</footer>)}
    </article>
  ),
);

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="app">
      <h2>RST Playground</h2>
      <PortalRouter />
      <BasicSection />
      <AsChild />
      <WithProps />
      <TagListSection />

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

      <section>
        <h3>Groups — nested config, nested accessors</h3>
        <p className="hint">
          The config nests plain objects: <code>Header</code>, <code>Body</code> and{" "}
          <code>Footer</code> are groups. Accessors and the <code>slots</code> object share the
          same shape, so the layout reads <code>slots.Header.Title</code>.
        </p>
        <Post>
          <Post.Header.Title icon="📝">Understanding React Slots</Post.Header.Title>
          <Post.Header.Meta>April 2025 · 5 min read</Post.Header.Meta>
          <Post.Body.Content>
            <Post.Body.Content.Lead>Groups namespace slots without a wrapper element.</Post.Body.Content.Lead>
            <Post.Body.Content.Body>
              <p>The nested accessor and the nested handle are generated from the same config.</p>
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

      <section>
        <h3>Shared group — one object, many layouts</h3>
        <p className="hint">
          <code>articleHeader</code> is a plain object of slots. <code>Article</code> nests it
          under <code>Header</code>; any other layout can do the same.
        </p>
        <Article>
          <Article.Header.Title>How RST Works</Article.Header.Title>
          <Article.Header.Byline>By Cristian Loghin · April 2025</Article.Header.Byline>
          <Article.Header.Tags>
            <Badge label="react" color="#61dafb33" />
          </Article.Header.Tags>
          <Article.Header.Tags>
            <Badge label="slots" color="#a78bfa33" />
          </Article.Header.Tags>
          <Article.Body>
            <p>This is the article body.</p>
          </Article.Body>
          <Article.Footer>Published in the RST blog.</Article.Footer>
        </Article>
      </section>

      <section>
        <h3>useSlotContext — typed slot context</h3>
        <p className="hint">
          <code>PanelStatusBadge</code> uses the selector overload and re-renders only when{" "}
          <code>open</code> changes. <code>PanelToggleButton</code> reads the full value. Both
          import <code>PanelContext</code>, not <code>Panel</code>.
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
