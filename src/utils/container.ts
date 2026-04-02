import type { ScrollContainer, ScrollPosition } from "../types";

function isWindow(container: ScrollContainer): container is Window {
  return typeof window !== "undefined" && container === window;
}

export function getScrollPosition(container: ScrollContainer): ScrollPosition {
  if (isWindow(container)) {
    return { left: window.scrollX || 0, top: window.scrollY || 0 };
  }
  return { left: container.scrollLeft || 0, top: container.scrollTop || 0 };
}


export function scrollToPosition(
  container: ScrollContainer,
  position: ScrollPosition,
  behavior: ScrollBehavior = "auto"
): void {
  if (isWindow(container)) {
    window.scrollTo({ left: position.left, top: position.top, behavior });
    return;
  }
  container.scrollTo({ left: position.left, top: position.top, behavior });
}

export function resolveContainer(
  getContainer: () => ScrollContainer | null | undefined
): ScrollContainer | null {
  try {
    return getContainer() ?? null;
  } catch {
    return null;
  }
}

