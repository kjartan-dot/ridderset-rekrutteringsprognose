export const number = (value: number) =>
  new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(value);
export const money = (value: number | null) =>
  value === null ? "Mangler tall" : `${number(value)} kr`;
export function date(value: string | null) {
  if (!value) return "Ikke oppgitt";
  return new Date(value).toLocaleDateString("nb-NO", {
    timeZone: "Europe/Oslo",
  });
}
export const difference = (offer: number | null, median: number | null) =>
  offer !== null && median !== null && median > 0
    ? Math.round((offer / median - 1) * 100)
    : null;
export const differenceText = (value: number | null) =>
  value === null
    ? "Ikke sammenlignbart"
    : value === 0
      ? "På nasjonal median"
      : `${Math.abs(value)} % ${value < 0 ? "under" : "over"} nasjonal median`;
