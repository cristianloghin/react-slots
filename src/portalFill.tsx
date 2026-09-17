import {
  ForwardedRef,
  forwardRef,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  ReactNode,
  RefAttributes,
} from "react";

// Marks a component as a carrier of portal fills. A layout that finds one among
// its direct children mounts it as a registrar instead of handing it to the
// render function as a plain child.
const PORTAL_FILL_KEY = Symbol("rst.portalFill");

/**
 * Wraps a component that renders portal fills, so a layout recognises it among
 * its direct children and mounts it.
 *
 * A layout collects fills by element type. A plain component that renders
 * `<Page.Dialog>` inside is opaque to that collection: as a direct child of
 * the layout it becomes a non-fill child, and a layout that does not render
 * `api.children` never mounts it, so the fill never registers. `portalFill`
 * stamps the component so the layout mounts it invisibly, exactly as it does a
 * `<Page.Dialog>` placed directly, and the fills inside register as usual.
 *
 * The component must render only portal fills (or nothing). It is mounted
 * ahead of the layout's own output, so any other markup it returns would be
 * painted there. Deeper in the tree, inside a rendered slot, it is an ordinary
 * component and the stamp is inert.
 *
 * Hooks are allowed; `render` receives the forwarded ref as its second
 * argument for wrappers that pass one through.
 *
 * @example
 * ```tsx
 * // confirmDialog.tsx
 * export const ConfirmDialog = portalFill(
 *   ({ children, ...props }: PropsWithChildren<DialogProps>) => (
 *     <Page.Dialog variant="danger" {...props}>{children}</Page.Dialog>
 *   ),
 * );
 *
 * <Page>
 *   <ConfirmDialog open={open} onOpenChange={setOpen}>Delete it?</ConfirmDialog>
 *   <Page.Body>…</Page.Body>
 * </Page>
 * ```
 */
export function portalFill<P extends object, E = unknown>(
  render: (props: P, ref: ForwardedRef<E>) => ReactNode,
): ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<E>> {
  // Own two-parameter function: React warns when a forwardRef render function
  // declares any other arity, and `render` may well take only props.
  const Component = forwardRef<E, P>(function PortalFill(props, ref) {
    return render(props as P, ref);
  });
  Component.displayName = `portalFill(${render.name || "Component"})`;
  Object.defineProperty(Component, PORTAL_FILL_KEY, { value: true });
  return Component as ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<E>>;
}

export function isPortalFill(type: unknown): boolean {
  return (
    (typeof type === "function" || (typeof type === "object" && type !== null)) &&
    (type as Record<symbol, unknown>)[PORTAL_FILL_KEY] === true
  );
}
