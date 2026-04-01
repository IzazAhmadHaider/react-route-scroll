import * as React from "react";
import type { RouteScrollOptions } from "./types";
import { useRouteScroll } from "./useRouteScroll";

export type RouteScrollManagerProps = RouteScrollOptions & {
  /**
   * When provided, renders children normally (manager is still active).
   * Default: renders nothing.
   */
  children?: React.ReactNode;
};

export function RouteScrollManager(props: RouteScrollManagerProps) {
  useRouteScroll(props);
  return <>{props.children}</>;
}

