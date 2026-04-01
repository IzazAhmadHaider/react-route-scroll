import * as React from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import type {
  LocationLike,
  RouteScrollOptions,
  ScrollBehaviorName,
  ScrollContext,
  ScrollPosition,
  ScrollRule,
  ScrollStorage
} from "./types";
import { getScrollPosition, resolveContainer, scrollToPosition } from "./utils/container";
import { scrollToHashWithWait } from "./utils/hashScroll";
import { isBrowserEnvironment } from "./utils/isBrowser";
import { matchAny, matchRoute } from "./utils/matchRoute";
import { createScrollPositionStore } from "./utils/storage";

type InternalOptions = RouteScrollOptions & {
  storage?: ScrollStorage;
};

type UseRouteScrollResult = {
  /** Imperatively scroll the managed container. */
  scrollTo: (pos: ScrollPosition, behavior?: ScrollBehavior) => void;
  /** Read the current scroll position from the managed container. */
  getPosition: () => ScrollPosition | null;
};

function toLocationLike(loc: ReturnType<typeof useLocation>): LocationLike {
  return { pathname: loc.pathname, search: loc.search, hash: loc.hash, key: loc.key };
}

function normalizeNavigationType(t: ReturnType<typeof useNavigationType>) {
  // react-router-dom already returns "POP" | "PUSH" | "REPLACE"
  return t;
}

function sortRules(rules: ScrollRule[] | undefined): ScrollRule[] {
  if (!rules?.length) return [];
  return [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

function pickRuleBehavior(
  rules: ScrollRule[],
  location: LocationLike
): import("./types").ScrollBehavior | undefined {
  for (const rule of rules) {
    if (matchRoute(rule.match, location)) return rule.behavior;
  }
  return undefined;
}

function isBehaviorObject(
  b: import("./types").ScrollBehavior
): b is Exclude<
  import("./types").ScrollBehavior,
  ScrollBehaviorName | ((ctx: ScrollContext) => unknown)
> {
  return typeof b === "object";
}

function coerceBehaviorName(
  b: import("./types").ScrollBehavior | undefined
): import("./types").ScrollBehavior | undefined {
  return b;
}

async function applyBehavior(opts: {
  behavior: import("./types").ScrollBehavior;
  ctx: ScrollContext;
  restorePosition?: ScrollPosition;
  scrollDelay: number;
  hashScroll: boolean;
  maxWaitMs: number;
  waitIntervalMs: number;
}): Promise<void> {
  const {
    behavior,
    ctx,
    restorePosition,
    scrollDelay,
    hashScroll,
    maxWaitMs,
    waitIntervalMs
  } = opts;

  if (!ctx.isBrowser) return;

  if (scrollDelay > 0) {
    await new Promise<void>((r) => setTimeout(r, scrollDelay));
  }

  if (typeof behavior === "function") {
    const res = await behavior(ctx);
    if (res && typeof res === "object" && "top" in res && "left" in res) {
      scrollToPosition(ctx.container, res as ScrollPosition);
    }
    return;
  }

  const name: ScrollBehaviorName | undefined =
    typeof behavior === "string" ? behavior : undefined;

  if (name === "preserve" || (isBehaviorObject(behavior) && behavior.type === "preserve")) {
    return;
  }

  if (name === "restore" || (isBehaviorObject(behavior) && behavior.type === "restore")) {
    if (restorePosition) scrollToPosition(ctx.container, restorePosition);
    return;
  }

  if (name === "top" || (isBehaviorObject(behavior) && behavior.type === "top")) {
    const pos: ScrollPosition =
      typeof behavior === "string"
        ? { left: 0, top: 0 }
        : behavior.type === "top"
          ? { left: behavior.left ?? 0, top: behavior.top ?? 0 }
          : { left: 0, top: 0 };
    scrollToPosition(ctx.container, pos);
    return;
  }

  // Hash is special: only works for window (scrollIntoView).
  if (
    name === "hash" ||
    (isBehaviorObject(behavior) && behavior.type === "hash") ||
    (hashScroll && ctx.location.hash)
  ) {
    const hash =
      isBehaviorObject(behavior) && behavior.type === "hash"
        ? behavior.hash ?? ctx.location.hash
        : ctx.location.hash;
    if (!hash) return;

    await scrollToHashWithWait({
      hash,
      container: ctx.container,
      maxWaitMs,
      waitIntervalMs
    });
    return;
  }

  if (isBehaviorObject(behavior) && behavior.type === "element") {
    if (ctx.container !== window) return;
    const el = document.querySelector(behavior.selector);
    if (el) {
      (el as HTMLElement).scrollIntoView({
        block: behavior.align ?? "start",
        inline: "nearest"
      });
      return;
    }
    if (behavior.fallbackToHash && ctx.location.hash) {
      await scrollToHashWithWait({
        hash: ctx.location.hash,
        container: ctx.container,
        maxWaitMs,
        waitIntervalMs
      });
    }
  }
}

export function useRouteScroll(options: InternalOptions = {}): UseRouteScrollResult {
  const location = useLocation();
  const navigationType = normalizeNavigationType(useNavigationType());

  const rules = React.useMemo(() => sortRules(options.rules), [options.rules]);

  const isBrowser = isBrowserEnvironment();

  const getContainer = React.useCallback(() => {
    if (!isBrowser) return null;
    if (options.getContainer) return options.getContainer() ?? null;
    if (options.containerRef?.current) return options.containerRef.current;
    return window;
  }, [isBrowser, options.getContainer, options.containerRef]);

  const storeRef = React.useRef(
    createScrollPositionStore(options.storage, options.onError)
  );
  React.useEffect(() => {
    storeRef.current = createScrollPositionStore(options.storage, options.onError);
  }, [options.storage, options.onError]);

  const prevLocationRef = React.useRef<LocationLike | undefined>(undefined);

  // Disable native restoration while mounted.
  React.useEffect(() => {
    if (!isBrowser) return;
    if (options.disableNativeScrollRestoration === false) return;
    const history = window.history as History & { scrollRestoration?: ScrollRestoration };
    const prev = history.scrollRestoration;
    try {
      if (typeof history.scrollRestoration === "string") history.scrollRestoration = "manual";
    } catch (e) {
      options.onError?.(e);
    }
    return () => {
      try {
        if (typeof history.scrollRestoration === "string" && prev)
          history.scrollRestoration = prev;
      } catch (e) {
        options.onError?.(e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBrowser, options.disableNativeScrollRestoration]);

  React.useEffect(() => {
    if (!isBrowser) return;
    if (options.enabled === false) return;

    const nextLocation = toLocationLike(location);
    const prevLocation = prevLocationRef.current;
    const container = resolveContainer(getContainer);
    if (!container) return;

    // Store scroll position for the route we're leaving.
    if (prevLocation?.key) {
      try {
        storeRef.current.set(prevLocation.key, getScrollPosition(container));
      } catch (e) {
        options.onError?.(e);
      }
    }

    // Apply behavior for the route we just entered.
    if (matchAny(options.exclude, nextLocation)) {
      prevLocationRef.current = nextLocation;
      return;
    }

    const ctx: ScrollContext = {
      location: nextLocation,
      prevLocation,
      navigationType,
      container,
      isBrowser
    };

    if (options.shouldHandleNavigation && !options.shouldHandleNavigation(ctx)) {
      prevLocationRef.current = nextLocation;
      return;
    }

    const behaviorFromRule = coerceBehaviorName(pickRuleBehavior(rules, nextLocation));
    const restoreOnPop = options.restoreOnPop ?? true;
    const hashScroll = options.hashScroll ?? true;
    const defaultBehavior = options.defaultBehavior ?? "top";

    const behavior: import("./types").ScrollBehavior =
      behaviorFromRule ??
      (hashScroll && nextLocation.hash ? "hash" : undefined) ??
      (restoreOnPop && navigationType === "POP" ? "restore" : defaultBehavior);

    const restorePosition =
      navigationType === "POP" && nextLocation.key
        ? storeRef.current.get(nextLocation.key)
        : undefined;

    void applyBehavior({
      behavior,
      ctx,
      restorePosition,
      scrollDelay: options.scrollDelay ?? 0,
      hashScroll,
      maxWaitMs: options.maxWaitMs ?? 250,
      waitIntervalMs: options.waitIntervalMs ?? 16
    });

    prevLocationRef.current = nextLocation;
  }, [
    isBrowser,
    location,
    navigationType,
    getContainer,
    options.enabled,
    options.exclude,
    options.shouldHandleNavigation,
    options.restoreOnPop,
    options.hashScroll,
    options.defaultBehavior,
    options.scrollDelay,
    options.maxWaitMs,
    options.waitIntervalMs,
    options.onError,
    rules
  ]);

  const scrollTo = React.useCallback(
    (pos: ScrollPosition, behavior?: ScrollBehavior) => {
      if (!isBrowser) return;
      const container = resolveContainer(getContainer);
      if (!container) return;
      const b = behavior ?? "auto";
      scrollToPosition(container, pos, b);
    },
    [getContainer, isBrowser]
  );

  const getPosition = React.useCallback(() => {
    if (!isBrowser) return null;
    const container = resolveContainer(getContainer);
    if (!container) return null;
    return getScrollPosition(container);
  }, [getContainer, isBrowser]);

  return { scrollTo, getPosition };
}

