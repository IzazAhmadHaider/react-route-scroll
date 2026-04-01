# react-route-scroll

Intelligent, production-ready **route-based scroll management** for React apps using **React Router v6+**.

It handles the real-world stuff:
- Scroll to top on route changes (by default)
- Restore scroll position on browser back/forward navigation
- Works with custom scroll containers (dashboards, `overflow-y-auto` layouts)
- Hash navigation (`/about#team`) with waiting/retries for late-loading content
- Exclude routes and define route-based scroll rules
- SSR-safe (no `window`/`document` access during server render)

## Install

```bash
npm i react-route-scroll
```

Peer deps:
- `react` (>= 18)
- `react-router-dom` (>= 6)

## Quick start (window scrolling)

Render the manager once inside your router tree (typically near the root layout).

```tsx
import { BrowserRouter } from "react-router-dom";
import { RouteScrollManager } from "react-route-scroll";

export function App() {
  return (
    <BrowserRouter>
      <RouteScrollManager />
      {/* your routes */}
    </BrowserRouter>
  );
}
```

Default behavior:
- **PUSH/REPLACE**: scroll to top
- **POP** (back/forward): restore previous position
- **Hash** (`#id`): scroll to anchor (with a short retry window)

## Custom scroll containers (dashboards)

If your app scrolls inside a container (not `window`), pass a `containerRef` or `getContainer`.

```tsx
import * as React from "react";
import { Outlet } from "react-router-dom";
import { RouteScrollManager } from "react-route-scroll";

export function DashboardLayout() {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} style={{ height: "100vh", overflowY: "auto" }}>
      <RouteScrollManager containerRef={scrollRef} />
      <Outlet />
    </div>
  );
}
```

## Excluding routes

Skip scroll handling for certain pages (modals, infinite feeds, etc).

```tsx
<RouteScrollManager
  exclude={[
    "/feed",
    /^\/chat\//,
    (loc) => loc.search.includes("keepScroll=1")
  ]}
/>
```

## Route-based rules

Rules let you define behavior by route. The first matching rule wins (sorted by `priority`, then array order).

```tsx
<RouteScrollManager
  rules={[
    { match: "/feed", behavior: "preserve" },
    { match: /^\/products\b/, behavior: "top" },
    { match: "/help", behavior: "hash" }
  ]}
/>
```

Supported behaviors:
- `"top"`: scroll to top-left
- `"restore"`: restore previous position (primarily for POP)
- `"preserve"`: do nothing
- `"hash"`: scroll to `location.hash` anchor (window-only)
- `{ type: "element", selector: "..." }`: scroll a selector into view (window-only)
- `(ctx) => ScrollPosition | void | Promise<...>`: custom logic

## Delayed scrolling (late-loading content)

For pages that load content after navigation, you can delay and/or increase the hash-wait budget.

```tsx
<RouteScrollManager scrollDelay={50} maxWaitMs={800} />
```

## Hook API

If you prefer hooks (or need imperative access), use `useRouteScroll()`.

```tsx
import { useRouteScroll } from "react-route-scroll";

export function ScrollControls() {
  const { scrollTo, getPosition } = useRouteScroll();

  return (
    <div>
      <button onClick={() => scrollTo({ left: 0, top: 0 }, "smooth")}>Top</button>
      <button onClick={() => console.log(getPosition())}>Log position</button>
    </div>
  );
}
```

## SSR

This package is SSR-safe: it only touches `window`/`document` inside effects.
On the server, it becomes a no-op.

## License

MIT

