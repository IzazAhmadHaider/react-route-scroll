import type * as React from "react";
import type { Location, To } from "react-router-dom";

export type ScrollPosition = { left: number; top: number };

export type ScrollContainer = Window | HTMLElement;

export type NavigationType = "POP" | "PUSH" | "REPLACE";

export type LocationLike = Pick<Location, "pathname" | "search" | "hash" | "key">;

export type MatchInput = LocationLike & { to?: To };

export type RouteMatcher =
  | string
  | RegExp
  | ((location: LocationLike) => boolean);

export type ScrollBehaviorName = "top" | "restore" | "preserve" | "hash";

export type ScrollBehavior =
  | ScrollBehaviorName
  | {
      type: "top" | "restore" | "preserve";
      left?: number;
      top?: number;
    }
  | {
      type: "hash";
      /** Override which element to scroll to (default: `location.hash`). */
      hash?: string;
      /**
       * If provided, attempts `document.querySelector(selector)` first.
       * Useful for non-id anchors.
       */
      selector?: string;
    }
  | {
      type: "element";
      selector: string;
      align?: ScrollLogicalPosition;
      /** If true, will also try `#id` from `location.hash` as fallback. */
      fallbackToHash?: boolean;
    }
  | ((
      ctx: ScrollContext
    ) => void | ScrollPosition | Promise<void | ScrollPosition>);

export type ScrollRule = {
  match: RouteMatcher;
  behavior: ScrollBehavior;
  /**
   * Lower runs first. First matching rule wins.
   * Default: 0.
   */
  priority?: number;
};

export type ShouldHandleNavigation = (ctx: ScrollContext) => boolean;

export type ScrollContext = {
  location: LocationLike;
  /** previous location (same shape), if any */
  prevLocation?: LocationLike;
  navigationType: NavigationType;
  container: ScrollContainer;
  /** true when running in a browser environment */
  isBrowser: boolean;
};

export type ScrollStorage =
  | { type: "memory" }
  | {
      type: "session";
      /** Default: "react-route-scroll" */
      key?: string;
    };

export type GetContainer = () => ScrollContainer | null | undefined;

export type RouteScrollOptions = {
  /**
   * If provided, this ref controls the scroll container.
   * Defaults to `window`.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /**
   * Alternative to `containerRef`. Useful when the container is created later.
   */
  getContainer?: GetContainer;
  /**
   * When true, the manager runs. Default: true.
   */
  enabled?: boolean;
  /**
   * Scroll storage for POP restoration.
   * Default: in-memory.
   */
  storage?: ScrollStorage;
  /**
   * Exclude routes from being handled at all.
   * If any matcher matches, scrolling is skipped.
   */
  exclude?: RouteMatcher[];
  /**
   * Route-based behavior rules. First match wins (by `priority`, then array order).
   */
  rules?: ScrollRule[];
  /**
   * Default behavior for PUSH/REPLACE when no rule matches and there is no hash.
   * Default: "top".
   */
  defaultBehavior?: Exclude<ScrollBehaviorName, "restore"> | "preserve";
  /**
   * When navigationType is "POP", prefer restore behavior.
   * Default: true.
   */
  restoreOnPop?: boolean;
  /**
   * If `location.hash` exists, attempt to scroll to the anchor.
   * Default: true.
   */
  hashScroll?: boolean;
  /**
   * When true, scroll restoration will keep the browser's own restoration disabled.
   * Default: true.
   */
  disableNativeScrollRestoration?: boolean;
  /**
   * Delay before attempting a scroll (ms). Useful for layouts that render async.
   * Default: 0.
   */
  scrollDelay?: number;
  /**
   * Retry budget for late-loading content (ms).
   * Default: 250.
   */
  maxWaitMs?: number;
  /**
   * Retry interval (ms) during waiting. Default: 16 (1 frame).
   */
  waitIntervalMs?: number;
  /**
   * Custom predicate; return false to skip handling this navigation.
   */
  shouldHandleNavigation?: ShouldHandleNavigation;
  /**
   * Called when an error occurs (e.g. sessionStorage access denied).
   */
  onError?: (error: unknown) => void;
};

