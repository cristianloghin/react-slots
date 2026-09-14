// ─── TagList — multiple slot instances ───────────────────────────────────────

import { createLayout, slot } from "@mikrostack/rst";

const Badge = ({ label, color = "#eee" }: { label: string; color?: string }) => (
  <span className="badge" style={{ background: color }}>
    {label}
  </span>
);

const TagList = createLayout(
  { Tag: slot({ multiple: true }) },
  (_, { slots }) => <div className="tag-list">{slots.Tag}</div>,
);

export function TagListSection() {
  return (
    <section>
      <h3>TagList — multiple slot instances</h3>
      <p className="hint">
        No <code>key</code> props on the fills — keys are assigned automatically. Open
        the console to confirm there are no key warnings.
      </p>
      <TagList>
        <TagList.Tag>
          <Badge label="react" color="#61dafb33" />
        </TagList.Tag>
        <TagList.Tag>
          <Badge label="typescript" color="#3178c633" />
        </TagList.Tag>
        <TagList.Tag>
          <Badge label="slots" color="#a78bfa33" />
        </TagList.Tag>
        <TagList.Tag>
          <Badge label="no keys needed" color="#fde68a33" />
        </TagList.Tag>
      </TagList>
    </section>
  );
}
