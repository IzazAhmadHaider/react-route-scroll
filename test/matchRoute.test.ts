import { describe, expect, test } from "vitest";
import { matchRoute } from "../src/utils/matchRoute";

describe("matchRoute", () => {
  test("matches exact string path", () => {
    expect(matchRoute("/about", { pathname: "/about", search: "", hash: "", key: "a" })).toBe(
      true
    );
    expect(matchRoute("/about", { pathname: "/about/", search: "", hash: "", key: "a" })).toBe(
      false
    );
  });

  test("matches regex", () => {
    expect(
      matchRoute(/^\/products\b/, {
        pathname: "/products/1",
        search: "",
        hash: "",
        key: "a"
      })
    ).toBe(true);
  });

  test("matches function", () => {
    expect(
      matchRoute((l) => l.pathname.startsWith("/dash"), {
        pathname: "/dash",
        search: "",
        hash: "",
        key: "a"
      })
    ).toBe(true);
  });
});

