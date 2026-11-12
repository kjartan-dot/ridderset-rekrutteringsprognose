import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sources from "../data/nav-sources.json";
import snapshot from "../data/nav-snapshot.json";
it("NAV-originalfiler stemmer med kontrollsummer og kildehenvisninger", () => {
  for (const item of sources) {
    expect(
      createHash("sha256")
        .update(readFileSync("data/raw/" + item.file))
        .digest("hex"),
    ).toBe(item.sha256);
    expect(item.url.startsWith("https://www.nav.no/")).toBe(true);
    expect(item.retrievedAt).toMatch(/^2026-/);
  }
  for (const row of snapshot.occupationShortages) {
    expect(row.low).toBeLessThanOrEqual(row.high);
    expect(row.sheet).toBe("Tabell V2 - 26");
    expect(row.row).toBeGreaterThan(3);
  }
});
