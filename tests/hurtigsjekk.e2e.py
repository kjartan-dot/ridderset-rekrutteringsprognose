"""Exercise the guided recruitment journey with synthetic source responses.

Start the local preview with `node scripts/hurtigsjekk-server.mjs`, then run
`python3 tests/hurtigsjekk.e2e.py`. Install Playwright and Chromium first.
Only local HTML and static assets reach the preview. Source requests are
fulfilled in Chromium and unexpected traffic is blocked and fails the test.
Use --output to choose a directory for the report, screenshots and test files.
"""

import argparse
import asyncio
from contextlib import asynccontextmanager
import json
from pathlib import Path
import re
from shutil import which
from tempfile import mkdtemp
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import Error, async_playwright, expect


MOBILE = {"width": 390, "height": 844}
DESKTOP = {"width": 1280, "height": 800}
COMPANY = {
    "name": "FIKTIV TESTBEDRIFT AS",
    "org": "111111110",
    "kind": "enheter",
    "town": "5503",
    "townName": "Harstad",
    "industryCode": "03.211",
    "industry": "Akvakultur",
    "employees": 12,
    "retrievedAt": "2026-11-21T08:00:00Z",
}
UNIT = {
    **COMPANY,
    "name": "FIKTIV TESTBEDRIFT AS AVD TEST",
    "org": "222222220",
    "kind": "underenheter",
    "town": "1866",
    "townName": "Hadsel",
    "parent": COMPANY["org"],
}
SURVEY = {
    "year": 2026,
    "scope": "national",
    "occupations": [
        {"code": "6221", "tightness_percent": 1, "shortage_estimate": 15},
        {"code": "7411", "tightness_percent": 2, "shortage_estimate": 25},
    ],
}


def local_base(value):
    url = urlsplit(value)
    if (
        url.scheme != "http"
        or url.hostname not in {"localhost", "127.0.0.1", "::1"}
        or url.username is not None
        or url.password is not None
        or url.path not in {"", "/"}
        or url.query
        or url.fragment
    ):
        raise argparse.ArgumentTypeError("--base must be the root URL of the local HTTP preview")
    return value.rstrip("/")


@asynccontextmanager
async def fixture_page(browser, base, source_route=None, **options):
    context = await browser.new_context(service_workers="block", **options)
    origin = urlsplit(base)[:2]
    unexpected = []
    errors = []

    async def route_request(route):
        url = urlsplit(route.request.url)
        if url[:2] == origin and route.request.method == "GET":
            if url.path == "/assets/nav-2026.json":
                await route.fulfill(json=SURVEY)
                return
            if url.path == "/" or url.path.startswith("/assets/"):
                await route.continue_()
                return
            if source_route and await source_route(route, url):
                return
        unexpected.append(route.request.url)
        await route.abort()

    await context.route("**/*", route_request)
    page = await context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        yield page
        assert not unexpected, f"Unexpected requests blocked by the fixture: {unexpected}"
        assert not errors, errors
    finally:
        await context.close()


def nav_fixture(ads):
    return {
        "coverage": True,
        "ads": ads,
        "backfilled": True,
        "employers": [],
        "checked_at": "2026-11-21T08:00:00Z",
    }


async def available_sources(route, url):
    params = parse_qs(url.query)
    if url.path == "/api/companies" and params.get("q") == ["Fiktiv testbedrift"]:
        await route.fulfill(json={"companies": [COMPANY], "hasMore": False})
    elif url.path == "/api/units" and params.get("org") == [COMPANY["org"]]:
        await route.fulfill(json={"companies": [UNIT], "hasMore": False})
    elif url.path == "/market/annonser":
        await route.fulfill(json=nav_fixture(3))
    elif url.path == "/market/lonn":
        await route.fulfill(json={"base": 50000, "total": 54000, "year": "2025"})
    else:
        return False
    return True


async def ready(page, base):
    await page.goto(base, wait_until="domcontentloaded")
    await expect(page.locator("#rrh-manual")).to_be_enabled()
    await expect(page.locator("#rr-hurtigsjekk")).to_have_attribute("data-journey-ready", "true")


async def no_overflow(page, stage):
    viewport, width = await page.evaluate("() => [innerWidth, document.documentElement.scrollWidth]")
    assert width <= viewport + 1, f"Horizontal overflow at {stage}: {width}px on {viewport}px"
    return {"stage": stage, "viewport": viewport, "document": width}


async def open_plan(page):
    await page.locator("#rrh-show-plan").click()
    await expect(page.locator("#rrh-plan-title")).to_be_focused()
    await expect(page.locator("#rrh-step-prepare")).to_have_attribute("aria-current", "step")
    await expect(page.locator("#rrh-plan-priorities > li")).to_have_count(3)
    await expect(page.locator("#rrh-download")).to_be_enabled()


async def download_plan(page):
    async with page.expect_download() as pending:
        await page.locator("#rrh-download").click()
    download = await pending.value
    assert download.suggested_filename == "ridderset-plan-for-rekruttering.txt"
    return Path(await download.path()).read_text(encoding="utf-8")


async def guided_journey(browser, base, output, viewport):
    name = "mobile" if viewport == MOBILE else "desktop"
    async with fixture_page(
        browser, base, available_sources, viewport=viewport, reduced_motion="reduce", accept_downloads=True
    ) as page:
        await ready(page, base)
        layout = [await no_overflow(page, "initial")]
        input_bounds = await page.locator("#rrh-company").bounding_box()
        assert input_bounds and input_bounds["y"] + input_bounds["height"] < viewport["height"]
        await page.screenshot(path=output / f"{name}-start.png", full_page=True)

        await page.locator("#rrh-company").fill("Fiktiv testbedrift")
        await page.locator("#rrh-search-btn").click()
        await page.locator("#rrh-company-results button").filter(has_text=COMPANY["name"]).click()
        await expect(page.locator("#rrh-company-summary")).to_contain_text(COMPANY["name"])
        await page.locator("#rrh-unit").select_option(UNIT["org"])
        await expect(page.locator("#rrh-company-summary")).to_contain_text(UNIT["name"])
        await expect(page.locator("#rrh-town")).to_have_value(UNIT["town"])
        await expect(page.locator("#rrh-town-origin")).to_have_text("fra bedriftsregisteret")
        await expect(page.locator("#rrh-role-suggestions button")).to_have_count(3)
        layout.append(await no_overflow(page, "company-and-unit"))

        await page.locator("#rrh-role-suggestions [data-code='6221']").click()
        await expect(page.locator("#rrh-result-title")).to_have_text("Havbruksarbeidere")
        await expect(page.locator("#rrh-result-location")).to_contain_text("Hadsel")
        await expect(page.locator("#rrh-score-output")).to_contain_text("/ 10")
        await expect(page.locator(".rrh-scale .is-current")).to_have_count(1)
        await expect(page.locator("#rrh-nav-card")).to_contain_text("3 annonser")
        await expect(page.locator("#rrh-pay-card")).to_contain_text(re.compile(r"50\s*000"))
        layout.append(await no_overflow(page, "market-result"))

        await page.locator("#rrh-role-suggestions [data-code='1312']").click()
        await page.locator("#rrh-town").select_option("5503")
        await expect(page.locator("#rrh-town-origin")).to_have_text("valgt av deg")
        await expect(page.locator("#rrh-nav-card h3")).to_have_text("Utlysninger i Harstad")
        await expect(page.locator("#rrh-score-output")).to_contain_text("Nasjonalt mangelsignal er ikke avklart")
        await expect(page.locator(".rrh-scale")).to_be_hidden()
        await expect(page.locator("#rrh-pay-card")).to_contain_text(re.compile(r"50\s*000"))

        await open_plan(page)
        await expect(page.locator("#rrh-readiness-questionnaire")).not_to_have_attribute("open", "")
        await expect(page.locator("#rrh-plan-intro")).to_contain_text("Her er et startpunkt")
        await expect(page.locator("#rrh-plan-context")).to_contain_text(f"{UNIT['name']} · Ledere innen akvakultur mv. · Harstad")
        await page.locator("#rrh-readiness-questionnaire summary").click()
        await expect(page.locator("#rrh-readiness-fields select")).to_have_count(5)
        await page.locator("#rrh-ready-selection").select_option("missing")
        await expect(page.locator("#rrh-plan-priorities > li").first).to_contain_text("Dere har oppgitt at dette ikke er avklart")
        await expect(page.locator("#rrh-readiness-status")).to_contain_text("1 av 5 forhold er vurdert")
        report = await download_plan(page)
        assert "Planregel: rr-process-plan-1.0" in report
        assert "Arbeidskommune: Harstad" in report
        assert "Strukturert intervju og vurdering: Ikke avklart" in report
        assert "STYRK08 1312" in report and UNIT["name"] in report
        assert "MARKEDSGRUNNLAG FRA DETTE OPPSLAGET" in report
        assert "Nasjonalt mangelsignal er ikke avklart" in report
        (output / f"{name}-download.txt").write_text(report, encoding="utf-8")
        layout.append(await no_overflow(page, "plan"))
        await page.screenshot(path=output / f"{name}-plan.png", full_page=True)

        await page.reload(wait_until="domcontentloaded")
        await expect(page.locator("#rrh-plan-context")).to_contain_text(f"{UNIT['name']} · Ledere innen akvakultur mv. · Harstad")
        await expect(page.locator("#rrh-plan-intro")).to_contain_text("Her er et startpunkt")
        await expect(page.locator("#rrh-readiness-status")).to_contain_text("Ingen svar er forhåndsutfylt")
        return {"name": f"guided journey {name}", "layout": layout}


async def unavailable_sources(route, url):
    if url.path in {"/api/companies", "/market/annonser", "/market/lonn"}:
        await route.fulfill(status=503, json={"error": "Test: kilden er utilgjengelig"})
        return True
    return False


async def failure_fixture(browser, base):
    async with fixture_page(
        browser, base, unavailable_sources, viewport=MOBILE, reduced_motion="reduce", accept_downloads=True
    ) as page:
        await ready(page, base)
        await page.locator("#rrh-company").fill("Fiktiv testbedrift")
        await page.locator("#rrh-search-btn").click()
        await expect(page.locator("#rrh-company-status")).to_contain_text("svarer ikke akkurat nå")
        await expect(page.locator("#rrh-company-results button")).to_have_count(0)
        await page.locator("#rrh-manual").click()
        await page.locator("#rrh-role-search").fill("elektriker")
        await page.locator("#rrh-role-results [data-code='7411']").click()
        await expect(page.locator("#rrh-result")).to_be_hidden()
        await page.locator("#rrh-town").select_option("5503")
        await expect(page.locator("#rrh-nav-card")).to_contain_text("utilgjengelige")
        await expect(page.locator("#rrh-pay-card")).to_contain_text("kunne ikke hentes")
        await expect(page.locator("#rrh-nav-card .rrh-factvalue")).to_have_count(0)
        await expect(page.locator("#rrh-pay-card .rrh-factvalue")).to_have_count(0)
        await open_plan(page)
        report = await download_plan(page)
        assert "Analyse uten registeroppslag" in report and "standardplan" in report
        return {"name": "manual plan during source failure"}


async def stale_fixture(browser, base):
    old_started = asyncio.Event()
    release_old = asyncio.Event()
    old_finished = asyncio.Event()
    pending_old = set()

    async def delayed_market(route, url):
        if url.path not in {"/market/annonser", "/market/lonn"}:
            return False
        params = parse_qs(url.query)
        is_old = params.get("yrke") == ["7411"] or params.get("q") == ["elektriker"]
        if is_old:
            pending_old.add(url.path)
            if len(pending_old) == 2:
                old_started.set()
            await release_old.wait()
        body = nav_fixture(99 if is_old else 2) if url.path == "/market/annonser" else {
            "base": 11111 if is_old else 22222, "total": 22222, "year": "2025",
        }
        try:
            await route.fulfill(json=body)
        except Error:
            # The old request may already have been canceled when the role changed.
            if not is_old:
                raise
        finally:
            if is_old:
                pending_old.remove(url.path)
                if not pending_old:
                    old_finished.set()
        return True

    async with fixture_page(
        browser, base, delayed_market, viewport=DESKTOP, reduced_motion="reduce", accept_downloads=True
    ) as page:
        try:
            await ready(page, base)
            await page.locator("#rrh-manual").click()
            await page.locator("#rrh-town").select_option("5503")
            await page.locator("#rrh-role-search").fill("elektriker")
            await page.locator("#rrh-role-results [data-code='7411']").click()
            await asyncio.wait_for(old_started.wait(), timeout=10)
            await open_plan(page)
            report = await download_plan(page)
            assert "NAV-treff var ikke ferdig hentet" in report
            assert "SSB-lønn var ikke ferdig hentet" in report

            await page.locator("#rrh-role-search").fill("industrimekaniker")
            await expect(page.locator("#rrh-result")).to_be_hidden()
            await page.locator("#rrh-role-results [data-code='7233']").click()
            await expect(page.locator("#rrh-pay-card")).to_contain_text(re.compile(r"22\s*222"))
            await expect(page.locator("#rrh-nav-card")).to_contain_text("2 annonser")
            release_old.set()
            await asyncio.wait_for(old_finished.wait(), timeout=10)
            await expect(page.locator("#rrh-pay-card")).not_to_contain_text(re.compile(r"11\s*111"))
            await expect(page.locator("#rrh-nav-card")).not_to_contain_text("99 annonser")
            await expect(page.locator("#rrh-result-title")).to_have_text("Anleggsmaskin- og industrimekanikere")
            return {"name": "early download and stale market responses"}
        finally:
            release_old.set()


async def no_javascript(browser, base):
    async with fixture_page(browser, base, java_script_enabled=False, viewport=MOBILE) as page:
        await page.goto(base, wait_until="domcontentloaded")
        await expect(page.locator("noscript p")).to_contain_text("Bedriftssøket trenger JavaScript")
        contact = page.get_by_role("link", name="Kontakt Ridderset for en vurdering.")
        await expect(contact).to_be_visible()
        await expect(contact).to_have_attribute("href", "https://ridderset.no/kontakt/?tema=rekruttering#book-mote")
        await expect(page.locator("#rrh-result")).to_be_hidden()
        await no_overflow(page, "javascript-disabled")
        return {"name": "no-JavaScript contact fallback"}


async def run(args):
    output = args.output or Path(mkdtemp(prefix="ridderset-hurtigsjekk-e2e-"))
    output.mkdir(parents=True, exist_ok=True)
    results = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=args.chromium)
        try:
            for viewport in [MOBILE, DESKTOP]:
                result = await guided_journey(browser, args.base, output, viewport)
                results.append(result)
                print(f"PASS {result['name']}", flush=True)
            for case in [failure_fixture, stale_fixture, no_javascript]:
                result = await case(browser, args.base)
                results.append(result)
                print(f"PASS {result['name']}", flush=True)
        finally:
            await browser.close()
            (output / "hurtigsjekk-e2e.json").write_text(
                json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
            )
    print(f"PASS all {len(results)} browser scenarios; report: {output / 'hurtigsjekk-e2e.json'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=local_base, default="http://127.0.0.1:3101")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--chromium", default=which("chromium"))
    asyncio.run(run(parser.parse_args()))
