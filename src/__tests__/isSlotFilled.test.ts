import { describe, expect, it } from "vitest";
import { isSlotFilled } from "../isSlotFilled";

const slots = {
  "Header.Title": "My Title",
  "Header.Action": ["Save", "Cancel"],
  "Header.Form": null,
  "Body.Main": null,
  "Body.Aside": "Aside content",
};

describe("isSlotFilled — exact key", () => {
  it("returns true for a filled single slot", () => {
    expect(isSlotFilled(slots, "Header.Title")).toBe(true);
  });

  it("returns false for a null single slot", () => {
    expect(isSlotFilled(slots, "Header.Form")).toBe(false);
  });

  it("returns true for a non-empty multiple slot", () => {
    expect(isSlotFilled(slots, "Header.Action")).toBe(true);
  });

  it("returns false for an empty multiple slot", () => {
    expect(isSlotFilled({ ...slots, "Header.Action": [] }, "Header.Action")).toBe(false);
  });

  it("returns false for an unknown key", () => {
    expect(isSlotFilled(slots, "Footer.Links")).toBe(false);
  });
});

describe("isSlotFilled — wildcard (some, default)", () => {
  it("returns true when at least one matching slot is filled", () => {
    expect(isSlotFilled(slots, "Header*")).toBe(true);
  });

  it("returns false when no matching slots are filled", () => {
    const emptyBody = { ...slots, "Body.Main": null, "Body.Aside": null };
    expect(isSlotFilled(emptyBody, "Body*")).toBe(false);
  });

  it("returns false when no keys match the prefix", () => {
    expect(isSlotFilled(slots, "Footer*")).toBe(false);
  });
});

describe("isSlotFilled — key array (some, default)", () => {
  it("returns true when at least one key in the array is filled", () => {
    expect(isSlotFilled(slots, ["Header.Title", "Header.Form"])).toBe(true);
  });

  it("returns false when no key in the array is filled", () => {
    expect(isSlotFilled(slots, ["Header.Form", "Body.Main"])).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isSlotFilled(slots, [])).toBe(false);
  });

  it("treats unknown keys as unfilled", () => {
    expect(isSlotFilled(slots, ["Footer.Links"])).toBe(false);
  });
});

describe("isSlotFilled — key array (all)", () => {
  it("returns true when all keys in the array are filled", () => {
    expect(isSlotFilled(slots, ["Header.Title", "Header.Action"], true)).toBe(true);
  });

  it("returns false when some keys in the array are not filled", () => {
    expect(isSlotFilled(slots, ["Header.Title", "Header.Form"], true)).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isSlotFilled(slots, [], true)).toBe(false);
  });
});

describe("isSlotFilled — wildcard (all)", () => {
  it("returns true when all matching slots are filled", () => {
    expect(isSlotFilled(slots, "Header*", true)).toBe(false); // Header.Form is null
  });

  it("returns true when all matching slots are filled", () => {
    const full = { ...slots, "Header.Form": "some form" };
    expect(isSlotFilled(full, "Header*", true)).toBe(true);
  });

  it("returns false when no keys match the prefix", () => {
    expect(isSlotFilled(slots, "Footer*", true)).toBe(false);
  });
});
