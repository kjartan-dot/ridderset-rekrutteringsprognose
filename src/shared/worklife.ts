import {
  dimensionKeys,
  type DimensionKey,
  type HrSupport,
  type WorklifeInput,
  type WorklifeResult,
} from "./types";
export const dimensions: {
  key: DimensionKey;
  label: string;
  hint: string;
  group: "Brand" | "Index";
}[] = [
  {
    key: "reputation",
    label: "Omdømme i kandidatmarkedet",
    hint: "Hvor attraktiv tror dere arbeidsplassen oppleves av aktuelle kandidater?",
    group: "Brand",
  },
  {
    key: "visibility",
    label: "Synlighet og troverdighet",
    hint: "Finner kandidater troverdig informasjon om oppgaver og arbeidsmiljø?",
    group: "Brand",
  },
  {
    key: "promise",
    label: "Vi innfrir løftene fra rekrutteringen",
    hint: "Stemmer arbeidshverdagen med forventningene dere skaper?",
    group: "Index",
  },
  {
    key: "onboarding",
    label: "Oppstart og integrering",
    hint: "Møter nyansatte en plan, støtte og tydelige milepæler?",
    group: "Index",
  },
  {
    key: "development",
    label: "Utvikling og mestring",
    hint: "Får ansatte utvikle kompetanse og se en fremtid hos dere?",
    group: "Index",
  },
  {
    key: "leadership",
    label: "Ledelse og oppfølging",
    hint: "Gir nærmeste leder jevnlig tilbakemelding og tydelig retning?",
    group: "Index",
  },
];
export const hrLabels: Record<HrSupport, string> = {
  unknown: "Ikke avklart",
  dedicated: "Intern HR / dedikert ressurs",
  shared: "Leder og administrasjon",
  external: "Ekstern HR-partner",
  both: "Intern HR og ekstern partner",
  none: "Ingen etablert HR-støtte",
};
export const hrAdvice: Record<HrSupport, string> = {
  unknown: "Avklar hvem som eier prosessen og hvor mye tid som er satt av.",
  dedicated: "Avtal kapasitet og ansvar mellom HR og ansettende leder.",
  shared:
    "Sett av konkret tid hos leder og administrasjon til søk, vurdering og oppstart.",
  external:
    "Avtal leveranser med partner og behold lederansvaret for oppstart og oppfølging.",
  both: "Fordel ansvar mellom intern HR, partner og leder, med én prosesseier.",
  none: "Utpek en prosesseier og sett av tid til stillingsanalyse, søk og oppfølging; vurder støtte ved kapasitetsbehov.",
};
export const emptyAnswers = () =>
  Object.fromEntries(
    dimensionKeys.map((k) => [k, null]),
  ) as WorklifeInput["answers"];
export function assessWorklife(input: WorklifeInput): WorklifeResult {
  const group = (keys: DimensionKey[]) => {
    const values = keys
      .map((k) => input.answers[k])
      .filter((v): v is number => v !== null);
    return {
      score:
        input.showIllustration && values.length
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10)
          : null,
      answered: values.length,
      total: keys.length,
    };
  };
  return {
    answered: dimensionKeys.filter((k) => input.answers[k] !== null).length,
    brand: group(["reputation", "visibility"]),
    index: group(["promise", "onboarding", "development", "leadership"]),
    promiseGap:
      input.showIllustration &&
      input.answers.reputation !== null &&
      input.answers.promise !== null
        ? input.answers.reputation - input.answers.promise
        : null,
    hrAdvice: hrAdvice[input.hrSupport],
    label: "Arbeidsgivers egenvurdering",
    validated: false,
  };
}
