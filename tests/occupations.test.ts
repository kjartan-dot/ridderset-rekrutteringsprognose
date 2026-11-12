import { expect, it } from "vitest";
import { occupations, searchOccupations } from "../src/server/occupations";
it("bevarer 407 unike kode/navn fra legacy uten lønnsverdier", () => {
  expect(occupations).toHaveLength(407);
  expect(new Set(occupations.map((x) => x.code)).size).toBe(407);
  expect(
    occupations.every((o) => Object.keys(o).sort().join(",") === "code,name"),
  ).toBe(true);
});
it.each([
  ["Salgsjef", "1221"],
  ["Salgssjef", "1221"],
  ["Tømrer", "7115"],
  ["Sykepleier", "2223"],
  ["Prosjektleder", "1323"],
  ["Prosjektsjef", "1323"],
  ["Rekrutterer", "2423"],
  ["Elektriker", "7411"],
  ["Driftstekniker", "3115"],
  ["Kokk", "5120"],
  ["Regnskapsfører", "3313"],
  ["HR-sjef", "1212"],
])("%s foreslår relevant kode %s", (query, code) =>
  expect(searchOccupations(query).map((r) => r.code)).toContain(code),
);
it("prioriterer eksakt kode og synonym; gjør flertydig prosjektleder synlig", () => {
  expect(searchOccupations("1221")[0].code).toBe("1221");
  expect(searchOccupations("Salgsjef")[0].code).toBe("1221");
  expect(
    searchOccupations("Prosjektleder").filter((x) => x.ambiguous).length,
  ).toBeGreaterThan(1);
  expect(searchOccupations("zxqfinnesikke")).toEqual([]);
});
