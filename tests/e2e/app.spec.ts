import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const step = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Steg i rekrutteringsvurderingen" })
    .getByRole("button", { name: new RegExp(name) });
async function chooseCompany(page: Page) {
  await page
    .getByRole("combobox", { name: "Søk etter virksomhet", exact: true })
    .fill("Nordlaks");
  await page
    .getByRole("option", { name: /^NORDLAKS PRODUKTER AS.*976725859/ })
    .click();
  await expect(page.getByLabel("Velg underenhet / avdeling")).toBeEnabled();
  await page.getByLabel("Velg underenhet / avdeling").selectOption("973149636");
  await expect(page.getByTestId("company-card")).toContainText(
    "NORDLAKS PRODUKTER AS AVD STOKMARKNES",
  );
  await page
    .getByRole("button", { name: "Foreslå HADSEL fra registeret" })
    .click();
  await expect(page.getByLabel("Fylke", { exact: true })).toHaveValue("18");
  await page
    .getByRole("checkbox", {
      name: "Jeg bekrefter at dette er stillingens faktiske arbeidssted.",
    })
    .check();
  await page
    .getByRole("button", { name: "Til stillingen", exact: true })
    .click();
}
async function chooseRole(page: Page) {
  await page.getByLabel("Konkret stillingstittel").fill("Salgsjef sjømat");
  const input = page.getByRole("combobox", {
    name: "Søk etter yrke eller STYRK08-kode",
  });
  await input.fill("Salgsjef");
  await expect(
    page.getByRole("option", { name: /Salgs- og markedssjefer/ }),
  ).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator(".occupation-selected")).toContainText("1221");
  await page.getByLabel("Antall ønskede ansettelser").fill("2");
  await page.getByLabel("Tilbudt månedslønn i kr").fill("75000");
  await page
    .getByLabel("Nødvendige krav og kompetanse")
    .fill("Salgsledelse og sjømatkompetanse");
  await page.getByRole("button", { name: "Se markedsbildet" }).click();
}
test("hele flyten: underenhet, markedsdata, seks skyvefelt, scenario og rapport", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await chooseCompany(page);
  await chooseRole(page);
  await expect(
    page.locator(".metric").first().getByText("89 170 kr", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Aktive annonser: utilgjengelig", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".metric")
    .first()
    .getByText("Kilde og avgrensning")
    .click();
  await expect(page.locator(".metric").first()).toContainText("2025 · Norge");
  await expect(page.locator(".metric").first()).toContainText("11418");
  await page.getByRole("button", { name: "Til egenvurderingen" }).click();
  await expect(page.getByTestId("brand-score")).toHaveText("Ikke vurdert");
  const sliders = page.getByRole("slider");
  await expect(sliders).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    await sliders.nth(i).focus();
    await sliders.nth(i).press("Home");
    for (let n = 0; n < [8, 7, 3, 6, 7, 6][i]; n++)
      await sliders.nth(i).press("ArrowRight");
  }
  await expect(page.getByTestId("brand-score")).toHaveText("75/100");
  await expect(page.getByTestId("index-score")).toHaveText("55/100");
  await expect(page.locator(".answered")).toContainText("6 av 6");
  await page
    .getByLabel("HR-støtte og rekrutteringskapasitet", { exact: true })
    .selectOption("none");
  await page.getByRole("button", { name: "Til din vurdering" }).click();
  await page
    .getByRole("checkbox", { name: /Utforsk et hypotetisk scenario/ })
    .check();
  await page.getByLabel("Tenkt månedslønn i kr").fill("100000");
  await page.getByLabel("Tenkt søkeområde").selectOption("national");
  await page.getByLabel("Alternativ kravprofil").selectOption("train");
  await page
    .getByRole("button", { name: "Lag rekrutteringsvurdering" })
    .click();
  const report = page.getByRole("article", { name: "Rekrutteringsvurdering" });
  await expect(report).toBeVisible();
  await expect(report).toContainText("NORDLAKS PRODUKTER AS AVD STOKMARKNES");
  await expect(report).toContainText("973149636");
  await expect(report).toContainText("976725859");
  await expect(report).toContainText("Ingen etablert HR-støtte");
  await expect(report).toContainText("INNEN 90 DAGER");
  await expect(report).toContainText("hypotetisk");
  expect(await report.innerText()).not.toMatch(/\bnull\b|undefined|NaN/);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-source").first()).toBeVisible();
  await expect(page.locator(".print-source").first()).toContainText(
    "https://www.ssb.no/statbank/table/11418",
  );
  await expect(page.locator(".hero")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Last ned rapport (.txt)" }).click();
  const download = await downloadPromise;
  const content = await readFile((await download.path())!, "utf8");
  expect(content).toContain("STYRK08 1221");
  expect(content).toContain("6 av 6");
  expect(content).toContain("Innen 60 dager");
  await testInfo.attach("rapport", {
    body: content,
    contentType: "text/plain",
  });
  await step(page, "Stilling").click();
  await page.getByLabel("Tilbudt månedslønn i kr").fill("85000");
  await step(page, "Din vurdering").click();
  await expect(
    page.getByRole("article", { name: "Rekrutteringsvurdering" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Lag rekrutteringsvurdering" })
    .click();
  await expect(page.locator(".report-facts").first()).toContainText(
    "85 000 kr",
  );
  expect(errors).toEqual([]);
});
test("synlige kildefeil og fungerende manuell fallback uten oppdiktet antall", async ({
  page,
}) => {
  await page.route("**/api/companies/search**", (route) =>
    route.fulfill({
      status: 502,
      json: {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "Enhetsregisteret er midlertidig utilgjengelig.",
        },
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Søk etter virksomhet", exact: true })
    .fill("Nordlaks");
  await expect(page.getByRole("status")).toContainText(
    "midlertidig utilgjengelig",
  );
  await page
    .getByText("Legg inn virksomheten manuelt", { exact: true })
    .click();
  await page.getByLabel("Virksomhetens navn").fill("Eksempelvirksomhet");
  await page.getByLabel("Antall personer (valgfritt)").fill("0");
  await page
    .getByRole("button", { name: "Bruk manuelle opplysninger" })
    .click();
  await expect(page.getByTestId("company-card")).toContainText(
    "OPPGITT AV ARBEIDSGIVER",
  );
  await expect(page.getByTestId("company-card")).toContainText("0");
  await page.getByLabel("Kommune / arbeidssted").fill("Tromsø");
  await page.getByLabel("Fylke", { exact: true }).selectOption("55");
  await page.getByRole("checkbox", { name: /Jeg bekrefter/ }).check();
  await page
    .getByRole("button", { name: "Til stillingen", exact: true })
    .click();
  await chooseRole(page);
  await step(page, "Din vurdering").click();
  await page
    .getByRole("button", { name: "Lag rekrutteringsvurdering" })
    .click();
  await expect(page.locator(".report")).toContainText(
    "0 personer oppgitt av arbeidsgiver",
  );
  await expect(page.locator(".report")).toContainText(
    "Oppgitt av arbeidsgiver",
  );
});
test("alle viste bedrifts- og yrkesforslag kan velges; flertydige titler har kodevalg", async ({
  page,
}) => {
  await page.goto("/");
  const companyInput = page.getByRole("combobox", {
    name: "Søk etter virksomhet",
    exact: true,
  });
  await companyInput.fill("Nordlaks");
  const list = page.locator(".search-results");
  await expect(list.getByRole("option").first()).toBeVisible();
  const companies = await list.locator("strong").allTextContents();
  for (let i = 0; i < companies.length; i++) {
    await companyInput.fill("Nordlaks");
    await list.getByRole("option").nth(i).click();
    await expect(page.getByTestId("company-card")).toContainText(companies[i]);
  }
  await page
    .getByRole("button", { name: "Underenhet / arbeidssted", exact: true })
    .click();
  await companyInput.fill("Nordlaks");
  await page.getByRole("option", { name: /AVD STOKMARKNES/ }).click();
  await expect(page.getByTestId("company-card")).toContainText(
    "VALGT UNDERENHET",
  );
  await step(page, "Stilling").click();
  const o = page.getByRole("combobox", {
    name: "Søk etter yrke eller STYRK08-kode",
  });
  await o.fill("Prosjektleder");
  await expect(list.getByRole("option").first()).toBeVisible();
  const options = await list.getByRole("option").allTextContents();
  expect(options.length).toBeGreaterThan(1);
  for (let i = 0; i < options.length; i++) {
    await o.fill("Prosjektleder");
    await list.getByRole("option").nth(i).click();
    const code = options[i].match(/STYRK08 (\d{4})/)![1];
    await expect(page.locator(".occupation-selected")).toContainText(code);
  }
  await o.fill("zxqfinnesikke");
  await expect(page.getByRole("status")).toContainText("Ingen treff");
  await o.fill("1221");
  await expect(list.getByRole("option").first()).toBeVisible();
  await o.press("Escape");
  await expect(o).toHaveAttribute("aria-expanded", "false");
});
test("startverdi må bekreftes, svar kan fjernes og vurderingen nullstilles", async ({
  page,
}) => {
  await page.goto("/");
  await step(page, "Worklife").click();
  await page
    .getByRole("button", {
      name: "Bekreft 5 for Omdømme i kandidatmarkedet",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("brand-score")).toHaveText("50/100");
  await page
    .getByRole("button", {
      name: "Fjern svar for Omdømme i kandidatmarkedet",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("brand-score")).toHaveText("Ikke vurdert");
  await page.getByRole("slider").first().press("End");
  await expect(page.getByTestId("brand-score")).toHaveText("100/100");
  await page.getByRole("button", { name: "Nullstill egenvurderingen" }).click();
  await expect(page.locator(".answered")).toContainText("0 av 6");
});
test("rapport validerer ufullstendig bestilling og håndterer SSB-feil", async ({
  page,
}) => {
  await page.goto("/");
  await step(page, "Din vurdering").click();
  await page
    .getByRole("button", { name: "Lag rekrutteringsvurdering" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Fullfør arbeidsgiver");
  await page.route("**/api/salary?**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "SSB er midlertidig utilgjengelig." } },
    }),
  );
  await step(page, "Arbeidsgiver").click();
  await chooseCompany(page);
  await chooseRole(page);
  await expect(page.getByRole("alert")).toContainText(
    "SSB er midlertidig utilgjengelig",
  );
  await page.unroute("**/api/salary?**");
  await page.getByRole("button", { name: "Prøv igjen", exact: true }).click();
  await expect(
    page.locator(".metric").first().getByText("89 170 kr", { exact: true }),
  ).toBeVisible();
});
test("responsive flater passer 360, 390, 768, 1280 og 1920 piksler", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [360, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("combobox", { name: "Søk etter virksomhet", exact: true }),
    ).toBeVisible();
  }
});
test("et gammelt rapportsvar kan ikke overta etter at bestillingen endres", async ({
  page,
}) => {
  await page.goto("/");
  await chooseCompany(page);
  await chooseRole(page);
  await step(page, "Din vurdering").click();
  let finish: (() => void) | undefined;
  const intercepted = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/report", async (route) => {
    const response = await route.fetch();
    await step(page, "Stilling").click();
    await page.getByLabel("Tilbudt månedslønn i kr").fill("95000");
    await route.fulfill({ response }).catch(() => {});
    finish!();
  });
  await page
    .getByRole("button", { name: "Lag rekrutteringsvurdering" })
    .click();
  await intercepted;
  await step(page, "Din vurdering").click();
  await expect(
    page.getByRole("article", { name: "Rekrutteringsvurdering" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lag rekrutteringsvurdering" }),
  ).toBeEnabled();
});
