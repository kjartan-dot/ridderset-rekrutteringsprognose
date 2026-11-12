/** Read-only live demo. Uses a fictional employer for all Worklife example answers. */
import { chromium, type Page } from "@playwright/test";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
const origin = process.env.DEMO_ORIGIN ?? "http://127.0.0.1:4180";
await mkdir("docs/demo", { recursive: true });
await mkdir("work/demo-videos", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--no-sandbox"],
  slowMo: 40,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: "work/demo-videos", size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const topOfStage = async (p: Page) =>
  p.evaluate(() =>
    window.scrollTo(
      0,
      document.querySelector(".stage")!.getBoundingClientRect().top +
        window.scrollY -
        16,
    ),
  );
await page.goto(origin);
await page
  .getByRole("combobox", { name: "Søk etter virksomhet", exact: true })
  .fill("Nordlaks");
await page
  .getByRole("option", { name: /^NORDLAKS PRODUKTER AS.*976725859/ })
  .click();
await page.getByLabel("Velg underenhet / avdeling").selectOption("973149636");
await page
  .getByRole("button", { name: "Foreslå HADSEL fra registeret" })
  .click();
await page.getByRole("checkbox", { name: /Jeg bekrefter/ }).check();
await page.screenshot({
  path: "docs/demo/desktop-brreg-live.png",
  fullPage: true,
});
// The real company is used only for official register lookups, never hypothetical scores.
await page.getByText("Legg inn virksomheten manuelt", { exact: true }).click();
await page.getByLabel("Virksomhetens navn").fill("Eksempelbedrift (demo)");
await page.getByRole("button", { name: "Bruk manuelle opplysninger" }).click();
await page.getByRole("checkbox", { name: /Jeg bekrefter/ }).check();
await page.getByRole("button", { name: "Til stillingen", exact: true }).click();
await page
  .getByLabel("Konkret stillingstittel")
  .fill("Salgsjef – illustrativt eksempel");
await page
  .getByRole("combobox", { name: "Søk etter yrke eller STYRK08-kode" })
  .fill("Salgsjef");
await page.getByRole("option", { name: /Salgs- og markedssjefer/ }).click();
await page.getByLabel("Tilbudt månedslønn i kr").fill("75000");
await page.getByLabel("Antall ønskede ansettelser").fill("2");
await page
  .getByLabel("Nødvendige krav og kompetanse")
  .fill(
    "Illustrativ bestilling: salgsledelse og bransjeforståelse. Ingen faktiske kundedata.",
  );
await page.getByRole("button", { name: "Se markedsbildet" }).click();
await page.locator(".metric").first().getByText("Kilde og avgrensning").click();
await page
  .locator(".metric")
  .first()
  .getByText("89 170 kr", { exact: true })
  .waitFor();
await topOfStage(page);
await page.screenshot({
  path: "docs/demo/desktop-market-live.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Til egenvurderingen" }).click();
const sliders = page.getByRole("slider");
for (let i = 0; i < 6; i++) {
  await sliders.nth(i).press("Home");
  for (let n = 0; n < [8, 7, 3, 6, 7, 6][i]; n++)
    await sliders.nth(i).press("ArrowRight");
}
await page
  .getByLabel("HR-støtte og rekrutteringskapasitet", { exact: true })
  .selectOption("shared");
await topOfStage(page);
await page.screenshot({
  path: "docs/demo/desktop-worklife-example.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await topOfStage(page);
await page.screenshot({
  path: "docs/demo/mobile-worklife-example.png",
  fullPage: true,
});
await page.setViewportSize({ width: 1280, height: 800 });
await page.getByRole("button", { name: "Til din vurdering" }).click();
await page
  .getByRole("checkbox", { name: /Utforsk et hypotetisk scenario/ })
  .check();
await page.getByLabel("Tenkt månedslønn i kr").fill("100000");
await page.getByLabel("Tenkt søkeområde").selectOption("national");
await page.getByLabel("Alternativ kravprofil").selectOption("train");
await page.getByRole("button", { name: "Lag rekrutteringsvurdering" }).click();
await page.getByRole("article", { name: "Rekrutteringsvurdering" }).waitFor();
await topOfStage(page);
await page.screenshot({
  path: "docs/demo/desktop-report-example.png",
  fullPage: true,
});
const promise = page.waitForEvent("download");
await page.getByRole("button", { name: "Last ned rapport (.txt)" }).click();
await (await promise).saveAs("docs/demo/example-report.txt");
await page.pdf({
  path: "docs/demo/example-report.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
});
const video = page.video()!;
await context.close();
await video.saveAs("docs/demo/walkthrough.webm");
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(origin);
await mobile.screenshot({ path: "docs/demo/mobile-start.png", fullPage: true });
await mobile.close();
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
await writeFile(
  "docs/demo/capture.json",
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      sourceMode: "Brreg and SSB live; NAV versioned snapshots",
      worklife: "Fictional employer and hypothetical answers",
      viewports: [
        { width: 1280, height: 800 },
        { width: 390, height: 844 },
      ],
      pageErrors: errors,
    },
    null,
    2,
  ) + "\n",
);
await copyFile("work/live-smoke.json", "docs/demo/live-source-check.json");
console.log(
  "Demo, screenshots, PDF, text and live source evidence: docs/demo/",
);
