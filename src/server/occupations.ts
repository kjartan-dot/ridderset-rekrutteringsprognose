import catalog from "../../data/occupations.json";
import synonyms from "../../data/occupation-synonyms.json";
import type { Occupation, OccupationMatch } from "../shared/types";
export const occupations: Occupation[] = catalog;
const aliases: Record<string, string[]> = synonyms;
export const normalize = (value: string) =>
  value
    .toLocaleLowerCase("nb-NO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function searchOccupations(query: string): OccupationMatch[] {
  const term = normalize(query);
  const rows = occupations
    .map((o) => {
      const title = normalize(o.name),
        words = (aliases[o.code] ?? []).map(normalize);
      const score =
        o.code === term
          ? 100
          : title === term
            ? 95
            : words.includes(term)
              ? 90
              : title.startsWith(term)
                ? 80
                : title.includes(term)
                  ? 70
                  : words.some((w) => w.includes(term))
                    ? 60
                    : term
                          .split(" ")
                          .every((w) =>
                            `${title} ${words.join(" ")}`.includes(w),
                          )
                      ? 40
                      : 0;
      return {
        ...o,
        score,
        match: (o.code === term
          ? "code"
          : words.includes(term)
            ? "synonym"
            : "name") as OccupationMatch["match"],
      };
    })
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nb"));
  const ambiguous = rows.filter((o) => o.score >= 90).length > 1;
  return rows
    .slice(0, 30)
    .map(({ score: _score, ...o }) => ({ ...o, ambiguous }));
}
