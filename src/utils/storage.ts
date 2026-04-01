import type { ScrollPosition, ScrollStorage } from "../types";

type RecordValue = ScrollPosition & { updatedAt: number };

export type ScrollPositionStore = {
  get(key: string): ScrollPosition | undefined;
  set(key: string, value: ScrollPosition): void;
  delete(key: string): void;
};

export function createScrollPositionStore(
  storage: ScrollStorage | undefined,
  onError?: (e: unknown) => void
): ScrollPositionStore {
  if (storage?.type === "session") {
    return createSessionStore(storage.key ?? "react-route-scroll", onError);
  }
  return createMemoryStore();
}

function createMemoryStore(): ScrollPositionStore {
  const map = new Map<string, RecordValue>();
  return {
    get(key) {
      const rec = map.get(key);
      if (!rec) return undefined;
      return { left: rec.left, top: rec.top };
    },
    set(key, value) {
      map.set(key, { ...value, updatedAt: Date.now() });
    },
    delete(key) {
      map.delete(key);
    }
  };
}

function createSessionStore(
  baseKey: string,
  onError?: (e: unknown) => void
): ScrollPositionStore {
  const keyFor = (k: string) => `${baseKey}:${k}`;

  const safeGet = (k: string): RecordValue | undefined => {
    try {
      const raw = sessionStorage.getItem(keyFor(k));
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecordValue(parsed)) return undefined;
      return parsed;
    } catch (e) {
      onError?.(e);
      return undefined;
    }
  };

  const safeSet = (k: string, v: RecordValue) => {
    try {
      sessionStorage.setItem(keyFor(k), JSON.stringify(v));
    } catch (e) {
      onError?.(e);
    }
  };

  const safeDelete = (k: string) => {
    try {
      sessionStorage.removeItem(keyFor(k));
    } catch (e) {
      onError?.(e);
    }
  };

  return {
    get(key) {
      const rec = safeGet(key);
      if (!rec) return undefined;
      return { left: rec.left, top: rec.top };
    },
    set(key, value) {
      safeSet(key, { ...value, updatedAt: Date.now() });
    },
    delete(key) {
      safeDelete(key);
    }
  };
}

function isRecordValue(v: unknown): v is RecordValue {
  if (!v || typeof v !== "object") return false;
  const rec = v as Record<string, unknown>;
  return (
    typeof rec.left === "number" &&
    typeof rec.top === "number" &&
    typeof rec.updatedAt === "number"
  );
}

