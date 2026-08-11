const unsafeSlotPathSegments = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export function assertSafeSlotPath(path: string): void {
  const unsafeSegment = path
    .split(".")
    .find((segment) => unsafeSlotPathSegments.has(segment));

  if (unsafeSegment) {
    throw new TypeError(
      `[rst] Invalid slot path "${path}": segment "${unsafeSegment}" is not allowed.`,
    );
  }
}
