"""Browser QA for the company-first recruitment flow.

Run the local adapter first: node scripts/hurtigsjekk-server.mjs
Then: python3 tests/hurtigsjekk.e2e.py

The live scenarios use Brreg and the deployed NAV/SSB adapters. Separate,
explicitly labelled fixture scenarios exercise failure and stale-response
handling. Fixture numbers are never written to application files or services.
Screenshots and the JSON report are scratch QA outputs, not product data.
"""

import argparse
import asyncio
import json
from pathlib import Path
import re
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright, expect


async def ready(page, base):
    await page.goto(base, wait_until="domcontentloaded")
    await expect(page.locator("#rrh-manual")).to_be_enabled(timeout=15000)


async def no_overflow(page, stage):
    measurements = await page.evaluate("""() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('#rr-hurtigsjekk *')]
        .map(el => ({tag:el.tagName,id:el.id,rect:el.getBoundingClientRect()}))
        .filter(x => x.rect.width && (x.rect.right > innerWidth + 1 || x.rect.left < -1))
        .slice(0, 8).map(x => ({tag:x.tag,id:x.id,left:x.rect.left,right:x.rect.right}))
    })""")
    assert measurements["document"] <= measurements["viewport"] + 1, f"Overflow at {stage}: {measurements}"
    return {"stage": stage, **measurements}


async def wait_market(page):
    await expect(page.locator("#rrh-nav-card")).not_to_contain_text("Henter NAV-treff", timeout=20000)
    await expect(page.locator("#rrh-pay-card")).not_to_contain_text("Henter SSB-tall", timeout=20000)


async def live_flow(browser, base, shots, viewport):
    name = "mobile" if viewport["width"] < 600 else "desktop"
    context = await browser.new_context(viewport=viewport, reduced_motion="reduce", accept_downloads=True)
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        await ready(page, base)
        layout = [await no_overflow(page, "initial")]
        input_bounds = await page.locator("#rrh-company").bounding_box()
        assert input_bounds and input_bounds["y"] + input_bounds["height"] < viewport["height"], "Company input is below first viewport"
        await page.screenshot(path=str(shots / f"{name}-start.png"), full_page=True)

        await page.locator("#rrh-company").fill("Nordlaks")
        await page.locator("#rrh-search-btn").click()
        main = page.locator("#rrh-company-results button").filter(has_text=re.compile(r"^NORDLAKS OPPDRETT AS\n"))
        await expect(main).to_have_count(1, timeout=20000)
        await main.click()
        await expect(page.locator("#rrh-company-summary")).to_contain_text("NORDLAKS OPPDRETT AS")
        await expect(page.locator("#rrh-unit-wrap")).to_be_visible(timeout=15000)
        await expect(page.locator("#rrh-unit option[value='980183130']")).to_have_count(1)
        await page.locator("#rrh-unit").select_option("980183130")
        await expect(page.locator("#rrh-company-summary")).to_contain_text("NORDLAKS OPPDRETT AS AVD STOKMARKNES")
        await expect(page.locator("#rrh-town")).to_have_value("1866")
        await expect(page.locator("#rrh-town-origin")).to_have_text("fra bedriftsregisteret")
        suggestions = await page.locator("#rrh-role-suggestions button").all_text_contents()
        assert len(suggestions) == 3, suggestions
        await expect(page.locator("#rrh-role-suggestions [data-code='6221']")).to_contain_text("Havbruksarbeidere")
        layout.append(await no_overflow(page, "company-and-unit"))

        await page.locator("#rrh-role-suggestions [data-code='6221']").click()
        await expect(page.locator("#rrh-result-title")).to_have_text("Havbruksarbeidere")
        await expect(page.locator("#rrh-result-location")).to_contain_text("Hadsel")
        await expect(page.locator("#rrh-score-output")).to_contain_text("/ 10")
        await expect(page.locator(".rrh-scale .is-current")).to_have_count(1)
        await wait_market(page)
        market_text = {
            "nav": await page.locator("#rrh-nav-card").inner_text(),
            "salary": await page.locator("#rrh-pay-card").inner_text(),
        }
        layout.append(await no_overflow(page, "result"))
        await page.screenshot(path=str(shots / f"{name}-result.png"), full_page=True)

        # A relevant leadership role in the same company has no published score.
        await page.locator("#rrh-role-suggestions [data-code='1312']").click()
        await expect(page.locator("#rrh-result-title")).to_have_text("Ledere innen akvakultur mv.")
        await expect(page.locator("#rrh-score-output")).to_contain_text("For lite grunnlag til en skår")
        await expect(page.locator(".rrh-scale .is-current")).to_have_count(0)

        # Changing place must update the visible analysis immediately.
        await page.locator("#rrh-town").select_option("5503")
        await expect(page.locator("#rrh-result-location")).to_contain_text("Harstad")
        await expect(page.locator("#rrh-nav-card h3")).to_have_text("Utlysninger i Harstad")
        await expect(page.locator("#rrh-town-origin")).to_have_text("valgt av deg")
        await wait_market(page)
        async with page.expect_download() as pending:
            await page.locator("#rrh-download").click()
        download = await pending.value
        report_path = shots / f"{name}-download.txt"
        await download.save_as(report_path)
        report = report_path.read_text(encoding="utf-8")
        assert "Arbeidskommune: Harstad" in report
        assert "STYRK-08 1312" in report
        assert "For lite grunnlag til en skår" in report
        assert "NORDLAKS OPPDRETT AS AVD STOKMARKNES" in report
        layout.append(await no_overflow(page, "missing-score-and-changed-place"))
        assert not errors, errors
        return {"kind": "live", "viewport": viewport, "company": "NORDLAKS OPPDRETT AS", "unit": "980183130", "suggestions": suggestions, "market": market_text, "layout": layout, "page_errors": errors}
    finally:
        await context.close()


async def failure_fixture(browser, base):
    context = await browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.route("**/api/companies?*", lambda route: route.fulfill(status=503, content_type="application/json", body='{"error":"TEST FIXTURE: source unavailable"}'))
    await page.route("**/market/*", lambda route: route.fulfill(status=503, content_type="application/json", body='{"error":"TEST FIXTURE: market unavailable"}'))
    try:
        await ready(page, base)
        await page.locator("#rrh-company").fill("Fixture failure")
        await page.locator("#rrh-search-btn").click()
        await expect(page.locator("#rrh-company-status")).to_contain_text("svarer ikke akkurat nå")
        await expect(page.locator("#rrh-company-results button")).to_have_count(0)
        await page.locator("#rrh-manual").click()
        await page.locator("#rrh-role-search").fill("elektriker")
        await page.locator("#rrh-role-results [data-code='7411']").click()
        await expect(page.locator("#rrh-result")).to_be_hidden()
        await page.locator("#rrh-town").select_option("5503")
        await wait_market(page)
        await expect(page.locator("#rrh-nav-card")).to_contain_text("utilgjengelige")
        await expect(page.locator("#rrh-pay-card")).to_contain_text("kunne ikke hentes")
        assert not errors, errors
        return {"kind": "fixture", "name": "company and market source failure", "manual_fallback": True, "no_fake_counts": True, "page_errors": errors}
    finally:
        await context.close()


async def stale_fixture(browser, base):
    context = await browser.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    old_started = asyncio.Event()
    release_old = asyncio.Event()
    old_finished = asyncio.Event()

    async def market_route(route):
        request = urlparse(route.request.url)
        params = parse_qs(request.query)
        is_old = params.get("yrke") == ["7411"] or params.get("q") == ["elektriker"]
        if is_old:
            old_started.set()
            await release_old.wait()
        if request.path.endswith("/lonn"):
            body = {"base": 11111 if is_old else 22222, "total": 22222, "year": "2025", "fixture": True}
        else:
            body = {"coverage": True, "ads": 99 if is_old else 2, "backfilled": True, "employers": [], "checked_at": "2026-11-21T08:00:00Z", "fixture": True}
        try:
            await route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
        except Exception:
            # AbortController may have already cancelled this intentionally old request.
            if not is_old:
                raise
        finally:
            if is_old:
                old_finished.set()

    await page.route("**/market/*", market_route)
    try:
        await ready(page, base)
        await page.locator("#rrh-manual").click()
        await page.locator("#rrh-town").select_option("5503")
        await page.locator("#rrh-role-search").fill("elektriker")
        await page.locator("#rrh-role-results [data-code='7411']").click()
        await asyncio.wait_for(old_started.wait(), timeout=10)
        await page.locator("#rrh-role-search").fill("industrimekaniker")
        await expect(page.locator("#rrh-result")).to_be_hidden()
        await page.locator("#rrh-role-results [data-code='7233']").click()
        await wait_market(page)
        new_salary = await page.locator("#rrh-pay-card").inner_text()
        assert "22222" in re.sub(r"\s", "", new_salary), new_salary
        await expect(page.locator("#rrh-nav-card")).to_contain_text("2 annonser")
        release_old.set()
        await asyncio.wait_for(old_finished.wait(), timeout=10)
        await page.wait_for_timeout(150)
        assert await page.locator("#rrh-pay-card").inner_text() == new_salary, "Old salary response replaced the current role"
        await expect(page.locator("#rrh-nav-card")).not_to_contain_text("99 annonser")
        await expect(page.locator("#rrh-result-title")).to_have_text("Anleggsmaskin- og industrimekanikere")
        assert not errors, errors
        return {"kind": "fixture", "name": "late market responses cannot overwrite selected role", "page_errors": errors}
    finally:
        release_old.set()
        await context.close()


async def no_javascript(browser, base):
    context = await browser.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
    page = await context.new_page()
    try:
        await page.goto(base, wait_until="domcontentloaded")
        await expect(page.locator("noscript")).to_contain_text("Bedriftssøket trenger JavaScript")
        await expect(page.locator("noscript a")).to_have_attribute("href", "https://ridderset.no/kontakt/")
        await expect(page.locator("#rrh-result")).to_be_hidden()
        await no_overflow(page, "javascript-disabled")
        return {"kind": "no-javascript", "contact_fallback": True}
    finally:
        await context.close()


async def run(args):
    shots = Path(args.output)
    shots.mkdir(parents=True, exist_ok=True)
    results = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=args.chromium, headless=True, args=["--no-sandbox"])
        try:
            for viewport in [{"width": 390, "height": 844}, {"width": 1280, "height": 800}]:
                result = await live_flow(browser, args.base, shots, viewport)
                results.append(result)
                print(f"PASS live flow {viewport['width']}×{viewport['height']}", flush=True)
            for case in [failure_fixture, stale_fixture, no_javascript]:
                result = await case(browser, args.base)
                results.append(result)
                print(f"PASS {result.get('name', result['kind'])}", flush=True)
        finally:
            await browser.close()
            (shots / "hurtigsjekk-e2e.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"PASS all {len(results)} browser scenarios; report: {shots / 'hurtigsjekk-e2e.json'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:3101")
    parser.add_argument("--output", default="/workspace/scratch/ef3e496bd143/qa")
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    asyncio.run(run(parser.parse_args()))
