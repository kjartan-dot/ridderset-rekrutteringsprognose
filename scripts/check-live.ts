/** Explicit, read-only smoke check. Never used by CI/offline tests. */
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { JsonClient } from "../src/server/http";
import { BrregAdapter } from "../src/server/adapters/brreg";
import { SsbAdapter } from "../src/server/adapters/ssb";
import sources from "../data/nav-sources.json";
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
  setGlobalDispatcher(new EnvHttpProxyAgent());
const brreg = new BrregAdapter(new JsonClient()),
  ssb = new SsbAdapter(new JsonClient());
const companies = await brreg.search("Nordlaks", "entity");
assert(companies.items.length > 0);
const main = companies.items.find((c) => c.name === "NORDLAKS PRODUKTER AS");
assert(main?.orgnr);
const units = await brreg.search("", "unit", 0, main.orgnr);
assert(units.items.length > 0);
const unit = await brreg.get(units.items[0].orgnr!, "unit");
assert.equal(unit.parentOrgnr, main.orgnr);
assert(
  (await brreg.search("Nordlaks", "unit")).items.every(
    (c) => c.kind === "unit",
  ),
);
const salaries = await Promise.all(
  ["1221", "2223"].map((code) => ssb.salary(code)),
);
for (const value of salaries) {
  assert.equal(value.source.geography, "Norge");
  assert.equal(value.source.table, "11418");
  assert(value.value !== null && value.value > 0);
}
const tables = [];
for (const table of ["03321", "07459", "09588", "01222", "07984", "11615"]) {
  const m = await ssb.metadata(table);
  tables.push({
    table,
    label: m.label,
    updated: m.updated,
    dimensions: Object.keys(m.dimension),
  });
}
const nav = [];
for (const source of sources) {
  const r = await fetch(source.url, {
    method: "HEAD",
    signal: AbortSignal.timeout(15000),
  });
  assert(r.ok);
  nav.push({ file: source.file, httpStatus: r.status });
}
const result = {
  checkedAt: new Date().toISOString(),
  companySearch: { status: "live", count: companies.items.length },
  unitLookup: { status: "live", parent: unit.parentOrgnr, orgnr: unit.orgnr },
  salaries,
  tables,
  navPublications: nav,
  navFeed: "unavailable; phase 2",
};
await mkdir("work", { recursive: true });
await writeFile("work/live-smoke.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
