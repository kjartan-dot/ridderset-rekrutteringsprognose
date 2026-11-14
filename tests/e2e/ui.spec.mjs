import {test,expect} from "@playwright/test";

test("model starts with clear data provenance and no fabricated market counts",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await expect(page.locator("#rr-job-status")).toContainText("407 yrkesgrupper");
  await expect(page.getByText("Aktive annonser i yrket og fylket")).toBeVisible();
  await expect(page.getByText("Ikke tilgjengelig",{exact:true})).toBeVisible();
  await expect(page.locator("#rr-brand-score")).toHaveText("Ikke fullført");
  await expect(page.locator("#rr-index-score")).toHaveText("Ikke fullført");
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
  expect(noOverflow).toBeTruthy();
});

test("Salgsjef resolves to STYRK08 1221 with historical national salary",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await page.locator("#rr-job-query").fill("salgsjef");
  await expect(page.locator("#rr-job-results .rr-suggestion").first()).toContainText("Salgs- og markedssjefer");
  await page.locator("#rr-job-results .rr-suggestion").first().click();
  await expect(page.locator("#rr-job-code")).toContainText("STYRK08 1221");
  await expect(page.locator("#rr-salary")).toContainText("89 170 kr");
  await page.locator("#rr-offer").fill("100000");
  await expect(page.locator("#rr-salary-delta")).toContainText("+");
});

test("mock company search, main unit and worksite selection",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await page.locator("#rr-company-query").fill("DEMO");
  await page.locator("#rr-company-search").click();
  await expect(page.locator("#rr-company-results .rr-suggestion").first()).toContainText("DEMO NORD AS");
  await page.locator("#rr-company-results .rr-suggestion").first().click();
  await expect(page.locator("#rr-company-name")).toHaveText("DEMO NORD AS");
  await expect(page.locator("#rr-company-meta")).toContainText("18 registrerte ansatte");
  await expect(page.locator("#rr-unit-zone")).toBeVisible();
  await page.locator("#rr-unit-select").selectOption("999999998");
  await expect(page.locator("#rr-company-name")).toContainText("SORTLAND");
  await expect(page.locator("#rr-location")).toHaveValue("SORTLAND");
});

test("searches subunits directly without inventing a parent company",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await page.locator("#rr-search-units").check();
  await page.locator("#rr-company-query").fill("DEMO");
  await page.locator("#rr-company-search").click();
  await expect(page.locator("#rr-company-results .rr-suggestion").first()).toContainText("DEMO NORD AS AVD SORTLAND");
  await page.locator("#rr-company-results .rr-suggestion").first().click();
  await expect(page.locator("#rr-company-name")).toContainText("SORTLAND");
});

test("manual company entry remains possible after no matches",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await page.locator("#rr-company-query").fill("IngenTreffEksempel");
  await page.locator("#rr-company-search").click();
  await expect(page.locator("#rr-company-status")).toContainText("Ingen treff");
  await page.locator(".rr-manual summary").click();
  await page.locator("#rr-manual-name").fill("MANUELT EKSEMPEL AS");
  await page.locator("#rr-manual-location").fill("Harstad");
  await page.locator("#rr-manual-employees").fill("0");
  await page.locator("#rr-manual-save").click();
  await expect(page.locator("#rr-company-name")).toHaveText("MANUELT EKSEMPEL AS");
  await expect(page.locator("#rr-company-meta")).toContainText("Egenrapportert");
  await expect(page.locator("#rr-company-meta")).toContainText("0 ansatte (egenoppgitt)");
});

test("Worklife sliders show results only after responses and update HR separately",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await expect(page.locator("#rr-brand-score")).toHaveText("Ikke fullført");
  async function slide(key,value){
    await page.locator("#rr-dim-"+key).evaluate((element,target)=>{
      element.value=String(target);
      element.dispatchEvent(new Event("input",{bubbles:true}));
    },value);
  }
  await slide("reputation",8);await slide("visibility",6);
  await expect(page.locator("#rr-brand-score")).toHaveText("73/100");
  await expect(page.locator("#rr-index-score")).toHaveText("Ikke fullført");
  await slide("promise",7);await slide("onboarding",8);
  await slide("development",9);await slide("leadership",6);
  await expect(page.locator("#rr-index-score")).toHaveText("77/100");
  await expect(page.locator("#rr-answered")).toContainText("6 av 6");
  await page.locator("#rr-hr").selectOption("external");
  await expect(page.locator("#rr-hr-status")).toHaveText("Ekstern HR-partner");
  await page.locator("#rr-reset").click();
  await expect(page.locator("#rr-brand-score")).toHaveText("Ikke fullført");
  await expect(page.locator("#rr-answered")).toContainText("0 av 6");
});

test("recovered API failure is explicit and does not block manual entry",async({page})=>{
  await page.route("**/wp-json/ridderset/v1/companies?**",route=>route.fulfill({
    status:503,contentType:"application/json",body:JSON.stringify({message:"Testfeil hos registeret"})
  }));
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await page.locator("#rr-company-query").fill("DEMO");
  await page.locator("#rr-company-search").click();
  await expect(page.locator("#rr-company-status")).toContainText("Testfeil hos registeret");
  await page.locator(".rr-manual summary").click();
  await page.locator("#rr-manual-name").fill("TESTBEDRIFT EGEN AS");
  await page.locator("#rr-manual-save").click();
  await expect(page.locator("#rr-company-name")).toContainText("TESTBEDRIFT EGEN AS");
});

test("exports decision note without implying statistical prediction",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#rr-notice")).toContainText("Modellen er aktiv");
  await page.locator("#rr-job-query").fill("salgsjef");
  await page.locator("#rr-job-results .rr-suggestion").first().click();
  const downloadWait=page.waitForEvent("download");
  await page.locator("#rr-download").click();
  const download=await downloadWait;
  expect(download.suggestedFilename()).toBe("ridderset-rekrutteringsinnsikt.txt");
  await expect(page.locator("#rr-download-status")).toContainText("Beslutningsnotatet");
});
