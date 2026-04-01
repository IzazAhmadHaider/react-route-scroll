import type { ScrollContainer } from "../types";

type Options = {
  hash: string;
  container: ScrollContainer;
  maxWaitMs: number;
  waitIntervalMs: number;
};

function cssEscape(input: string): string {
  // CSS.escape is not supported in older environments; this conservative escape
  // handles common id characters.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const native = (globalThis as any).CSS?.escape as ((s: string) => string) | undefined;
  if (native) return native(input);
  return input.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function decodeHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function canScrollIntoView(container: ScrollContainer): boolean {
  return container === window;
}

function scrollElementIntoView(el: Element, align: ScrollLogicalPosition = "start") {
  const element = el as HTMLElement;
  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ block: align, inline: "nearest" });
  }
}

function findAnchor(hash: string): Element | null {
  const decoded = decodeHash(hash);
  if (!decoded) return null;

  // Prefer id
  const byId = document.getElementById(decoded);
  if (byId) return byId;

  // Then name= anchors
  try {
    const nameSel = `a[name="${cssEscape(decoded)}"]`;
    const byName = document.querySelector(nameSel);
    if (byName) return byName;
  } catch {
    // ignore invalid selector
  }

  // Finally, raw query selector if it looks like one
  // (e.g. `#team` already handled; but `/x##foo` can happen)
  try {
    const sel = `#${cssEscape(decoded)}`;
    return document.querySelector(sel);
  } catch {
    return null;
  }
}

export async function scrollToHashWithWait(opts: Options): Promise<boolean> {
  const { hash, container, maxWaitMs, waitIntervalMs } = opts;
  if (!hash || hash === "#") return false;
  if (!canScrollIntoView(container)) return false;

  const start = performance.now();
  // Try immediately, then retry for a short window (async content).
  // We avoid MutationObserver here to keep the package lightweight & predictable.
  while (performance.now() - start <= maxWaitMs) {
    const anchor = findAnchor(hash);
    if (anchor) {
      scrollElementIntoView(anchor, "start");
      return true;
    }
    await new Promise<void>((r) => setTimeout(r, waitIntervalMs));
  }
  return false;
}

