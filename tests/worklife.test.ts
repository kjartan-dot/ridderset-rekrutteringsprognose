import { describe, expect, it } from "vitest";
import { assessWorklife, emptyAnswers } from "../src/shared/worklife";
import { worklifeSchema } from "../src/shared/contracts";
describe("Worklife – besvarte felt, adskilte nivåer", () => {
  it("rapporterer ikke startverdier som observasjoner", () => {
    const result = assessWorklife({
      answers: emptyAnswers(),
      hrSupport: "unknown",
      showIllustration: true,
    });
    expect(result.answered).toBe(0);
    expect(result.brand.score).toBeNull();
    expect(result.index.score).toBeNull();
    expect(result.promiseGap).toBeNull();
    expect(result.validated).toBe(false);
  });
  it("beregner delscore bare fra besvarte spørsmål, også eksplisitt nullpunkt", () => {
    const answers = { ...emptyAnswers(), reputation: 0, onboarding: 8 };
    const result = assessWorklife({
      answers,
      hrSupport: "none",
      showIllustration: true,
    });
    expect(result.answered).toBe(2);
    expect(result.brand).toEqual({ score: 0, answered: 1, total: 2 });
    expect(result.index).toEqual({ score: 80, answered: 1, total: 4 });
    expect(result.hrAdvice).toContain("prosesseier");
  });
  it("kan slå av illustrative delscorer uten å miste svar og HR", () => {
    const answers = {
      reputation: 8,
      visibility: 6,
      promise: 3,
      onboarding: 5,
      development: 7,
      leadership: 9,
    };
    expect(
      assessWorklife({
        answers,
        hrSupport: "external",
        showIllustration: true,
      }),
    ).toMatchObject({
      brand: { score: 70 },
      index: { score: 60 },
      promiseGap: 5,
    });
    expect(
      assessWorklife({
        answers,
        hrSupport: "external",
        showIllustration: false,
      }),
    ).toMatchObject({
      answered: 6,
      brand: { score: null },
      index: { score: null },
      hrAdvice: expect.stringContaining("partner"),
    });
  });
  it("avviser ufullstendige og ugyldige svar på API-grensen", () => {
    expect(
      worklifeSchema.safeParse({
        answers: { ...emptyAnswers(), promise: 11 },
        hrSupport: "none",
        showIllustration: true,
      }).success,
    ).toBe(false);
    expect(
      worklifeSchema.safeParse({
        answers: { reputation: 5 },
        hrSupport: "unknown",
        showIllustration: true,
      }).success,
    ).toBe(false);
  });
});
