"""Verify the prepared Worklife block in a local WordPress page."""

import argparse
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright


def download_report(page):
    with page.expect_download() as downloaded:
        page.locator("#pf-report").click()
    return Path(downloaded.value.path()).read_text(encoding="utf-8")


def exercise(page):
    page.locator("#pf-extras > summary").click()
    page.locator("#pf-extras [data-pane=promises]").click()
    expect(page.locator("#pf-summary")).to_be_empty()
    empty = download_report(page)
    assert "Ingen kontrollpunkter er registrert." in empty
    assert "0 av 0" not in empty

    page.locator("#pf-claim-settings > summary").click()
    page.locator("#pf-count-settings > summary").click()
    for name, value in {
        "name": "Prosjektgruppen mottar en skriftlig oppstartplan.",
        "criterion": "Plan leveres før den første arbeidsdagen.",
        "group": "Ti syntetiske tilfeller",
        "origin": "Syntetisk testannonse",
        "start": "2024-01-01",
        "end": "2024-03-31",
        "target": "80",
        "agreed": "2024-01-02",
        "done": "9",
        "eligible": "10",
        "log": "Syntetisk praksislogg",
        "yes": "9",
        "valid": "10",
        "invited": "10",
        "voice": "Syntetisk oppstartspuls",
    }.items():
        page.locator(f"#pf-claim-{name}").fill(value)
    page.locator("#pf-count-settings [data-field=same]").check()

    result = page.locator("#pf-result")
    expect(result).to_contain_text("Målet må tidfestes")
    expect(result).to_contain_text("Registrert gjennomføring")
    expect(result).not_to_contain_text("Avtalt mål")
    expect(result).not_to_contain_text("prosentpoeng")
    late = download_report(page)
    assert "Oppgitt mål: 80 %. Oppgitt dato: 2024-01-02" in late
    assert "Logg mot mål:" not in late
    assert "Ja-andel blant ansatte som svarte, målt mot målet:" not in late

    page.locator("#pf-claim-agreed").fill("2024-01-01")
    expect(result).to_contain_text("Løftet har støtte i begge kilder")
    expect(result).to_contain_text("10 prosentpoeng over målet")
    agreed = download_report(page)
    assert "Logg mot mål: 10 prosentpoeng over målet." in agreed
    assert "Ja-andel blant ansatte som svarte, målt mot målet: 10 prosentpoeng over målet." in agreed
    assert "EGNE TALL" in agreed

    page.locator("#pf-extras > summary").click()
    page.locator("#pf-extras [data-mode=demo]").click()
    demo = download_report(page)
    assert "FIKTIVT EKSEMPEL" in demo
    assert "seks felles spørsmålene fordelt på tre temaer" in demo


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Loopback URL for WordPress with the prepared block")
    args = parser.parse_args()
    base = urlsplit(args.url)
    if base.hostname not in {"localhost", "127.0.0.1", "::1"} or base.scheme != "http":
        parser.error("Use a local HTTP test page.")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium")
        for width, height in [(390, 844), (1280, 800)]:
            context = browser.new_context(
                viewport={"width": width, "height": height},
                locale="nb-NO",
                timezone_id="Europe/Oslo",
                accept_downloads=True,
            )
            context.route(
                "**/*",
                lambda route: route.continue_()
                if urlsplit(route.request.url).netloc == base.netloc
                else route.abort(),
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(args.url)
            exercise(page)
            assert not errors, errors
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            print(f"{width}×{height}: Worklife comparison and exports passed")
            context.close()
        browser.close()


if __name__ == "__main__":
    main()
