import { describe, expect, test } from "vitest";
import { createScrollPositionStore } from "../src/utils/storage";

describe("createScrollPositionStore", () => {
  test("memory store round-trips positions", () => {
    const store = createScrollPositionStore({ type: "memory" });
    store.set("k1", { left: 10, top: 20 });
    expect(store.get("k1")).toEqual({ left: 10, top: 20 });
    store.delete("k1");
    expect(store.get("k1")).toBeUndefined();
  });
});

