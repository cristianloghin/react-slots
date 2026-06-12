import { ReactNode } from "react";

export function withProps<P extends object, K extends keyof P>(
  Component: (props: P) => ReactNode,
  boundProps: Pick<P, K>,
): (props: Omit<P, K>) => ReactNode {
  return (props) => Component({ ...boundProps, ...props } as unknown as P);
}
