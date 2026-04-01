import type { LocationLike, RouteMatcher } from "../types";

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function matchRoute(matcher: RouteMatcher, location: LocationLike): boolean {
  const pathname = normalizePath(location.pathname);

  if (typeof matcher === "string") {
    const target = normalizePath(matcher);
    return pathname === target;
  }

  if (matcher instanceof RegExp) {
    return matcher.test(pathname);
  }

  return Boolean(matcher(location));
}

export function matchAny(
  matchers: RouteMatcher[] | undefined,
  location: LocationLike
): boolean {
  if (!matchers?.length) return false;
  return matchers.some((m) => matchRoute(m, location));
}

