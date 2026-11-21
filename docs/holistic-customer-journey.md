# Customer journey: value before publication of a vacancy

Release: WordPress integration 0.3.3, 21 November 2026.

Deployment status: 0.3.3 is installed, and the journey on public page 2124 was activated and verified on 21 November 2026 after the final private-page check passed. The active shortcode is `[rr_hurtigsjekk guided="1" journey="1"]`.

## Intended customer outcome

An employer should understand what the market evidence can support, leave with a practical recruitment plan, and choose how to resource the work. The plan is available without more questions, registration or an email address. Five optional answers refine three priorities. These are planning rules, not a prediction of applicants, hiring success or reputation.

## Review of the actual previous flow

The review used the live 0.2.1 page, current source and five desktop captures: company selection, market result, scenario, Worklife and decision note. The review included task entry, hierarchy, defaults, next actions and the output the customer could take away. It was a product-flow review with a limited accessibility check, not a user study, full WCAG audit or WCAG certification.

| Step | Observed strength | Material finding | Change |
| --- | --- | --- | --- |
| Company and role | One verified employer context already followed the tools. | The introduction described the input mechanism more clearly than the customer benefit. | Lead with preparing the next recruitment and give four navigable steps. |
| Market | NAV/SSB evidence, levels and caveats were available. | A missing score left a large empty scale; an early sales CTA preceded a useful plan. | Hide the empty scale, interpret available evidence and take the user to preparation. |
| Scenario | Concrete choices for requirements, location and channels existed. | The illustrative default appeared as 8/8 constraints before confirmation. | Require explicit confirmation, clear it on changes and show conditional advice without the visible total in the guided journey. |
| Worklife | Employer reflection covered both promises and employee experience. | Unanswered 5/10 defaults generated 50/100, and ties arbitrarily selected reputation as the weakest dimension. | Require all answers within each category; preserve unanswered as null; require a unique minimum before naming one weakest dimension. |
| Decision and contact | A report and service links were present. | Several scores and exports competed; interviews, candidate communication and onboarding were underdeveloped. | One primary plan/download, concrete guides, accountable process stages and three explicit support choices. |

## Current experience

1. Select employer once, then role and actual workplace.
2. Read the national occupation signal, observed NAV text matches and national salary reference.
3. Continue to a start plan immediately. Five optional questions are inside a closed disclosure: brief, reach/offer, selection, communication, and onboarding.
4. Get three priorities with an action, a deliverable and suggested owner. The full plan contains all five stages, an interview guide, communication plan, and follow-up before start and at 30/60/90 days after start.
5. Choose to carry out the process internally, discuss selected parts, or explore support through the process.

The prioritization order is explicit: stated missing, stated partial, unanswered, ready. Within each status, recruitment stage order is used. Unanswered means unassessed, not a diagnosed weakness. When all five are ready, the next tasks are quality checks and execution. No new overall score is produced.

A strong recruitment process cannot guarantee more qualified applicants. The copy gives the employer practical control over clarity, assessment and follow-up, and does not present agency services or active sourcing as the automatic answer.

## Evidence and editorial boundaries

The following are primary research publications supporting the general direction. The practical checklist and prioritization are Ridderset's implementation, not a validated combined model.

- Sackett, Zhang, Berry and Lievens (2023): job analysis and job-specific selection measures, with explicit attention to the role and context. [Cambridge original article](https://doi.org/10.1017/iop.2023.24). This does not justify identical tests for experienced candidates and roles where skills will be learned after hiring.
- Hausknecht, Day and Thomas (2004): applicant perceptions of selection are associated with views of the employer and reported intentions. [Cornell original publication](https://ecommons.cornell.edu/entities/publication/4ab12de5-15ca-4de2-b9d4-efb3609b51ae). The interface does not claim a certain effect on actual acceptance, employer reputation or referrals.
- Bauer, Bodner, Erdogan, Truxillo and Tucker (2007): role clarity, self-efficacy and social acceptance in newcomer adjustment. [Portland State original publication](https://pdxscholar.library.pdx.edu/busadmin_fac/27/). The suggested 30/60/90 cadence is a practical template, not a universally validated schedule from the study.

Market sources remain separately identified next to each result and in the download. National occupation pressure is not local candidate availability. NAV text matches are not candidate counts; zero matches is not evidence of easy recruitment. The plan never combines self-ratings with public data into a hiring probability.

## State and export

- Company, selected unit, actual workplace, role and salary continue through the existing shared context. The input-only eight-hour session context is unchanged.
- Five process answers live only in the open document. They are not sent to Ridderset or persisted. The UI says to download before reload/close.
- A different legal employer or occupation clears process answers. A unit under the same legal employer retains them; a workplace change requests review of retained answers.
- Worklife uses its actual touched-set, including valid explicit values of zero and five. Brand requires 2/2; Index 4/4; aggregate/weakest requires 6/6, with a unique lowest value for the latter.
- Confirmed optional scenario and explicitly answered Worklife dimensions can be included in the single download. Unconfirmed examples and untouched slider values are excluded.
- Plan download stays enabled when role and actual workplace are ready, with or without a selected company, even while sources are loading. An unfinished source is explicitly identified in the file.

## Integration and rollback

`[rr_hurtigsjekk guided="1" journey="1"]` opts a page into the new journey. `guided="1"` alone uses preserved `stable-0.2.1/` frontend assets. The original non-guided entry point still uses `previous/` assets.

The private-page test caught WordPress rendering an added `&&` as `&#038;&#038;` in an inline Worklife script, despite correct raw saved content. The three changed runtimes are now external files: `legacy-worklife.js`, `legacy-scenario.js`, and `legacy-decision.js`, each referenced with `?ver=0.3.3`. Their script positions are preserved in the page markup. No large new JavaScript body is authored in Gutenberg.

Rebuild the page from a fresh approved 0.2.1 raw snapshot:

```sh
python3 scripts/patch-holistic-legacy.py --input /absolute/path/before.html --output /absolute/path/patched.html
python3 scripts/prepare-holistic-page.py --input /absolute/path/patched.html --output /absolute/path/after.html --version 0.3.3
```

The first script fails if protected source differs. The second extracts the runtime assets and switches the shortcode/optional-tool heading. `integrations/wordpress/holistic-journey.patch` records the focused page changes without adding another full page snapshot.

Upload the plugin first, test on a private page, and then replace only the affected WordPress sections using fresh block hashes and page locks. Retain the new plugin when rolling back the shortcode to `guided="1"`, because the corrected legacy page points to its external files. A full older-package rollback also requires restoring the matching earlier page block.

## Public deployment and verification, 21 November 2026

Page 2124 has status `publish`. WordPress returned `modified: 2026-11-21T13:23:19` (WordPress time, without an assumed time zone) and `content_hash: 4a4afa10e6d385dbfbd20d0d1548aa587ed26624`. Block 2 was replaced first, followed by block 0 containing `[rr_hurtigsjekk guided="1" journey="1"]`. No content warnings were returned.

The public browser check confirmed:

- KUPA AS, occupation code 2421 and Harstad were retained after reload.
- Four navigation steps were visible.
- The five optional questions were in a closed disclosure and remained unanswered.
- The plan was available without new answers.
- The plan button moved focus and the viewport correctly.
- One active primary download action was present.

An unauthenticated HTTP request returned 200 with the new plan markup and all three external legacy runtime references. WordPress's combined JavaScript asset also returned 200 and contained the current process model, plan action and active-step handling. Private QA pages 3392 and 3400 were moved to recoverable trash after the public check.

## Pre-release validation

- 65 Node tests passed, including eight tests for the pure process model and report.
- The actual eight legacy script bodies passed an offline DOM harness covering unanswered, partial, complete and tied self-assessments; JSON/TXT output; scenario confirmation and reset. No external requests were used by that harness.
- Real WordPress private-page interaction verified company and unit continuity, role reset, new-employer reset, five optional statuses, three priorities, Worklife 2/2 versus unassessed Index, and scenario invalidation on change.
- Actual downloaded files were inspected: context and process statuses matched, explicitly entered self-ratings were retained, and untouched 50/100 and default 8/8 were absent.
- Mobile was checked in an actual 390×844 iframe viewport. At 373 CSS content pixels, scrollWidth equalled clientWidth. An Oslo/manual-start plan remained available despite northern-only coverage of optional legacy market data.
- Focus and labels were checked for the new controls. Reset moves focus to the first question; navigation focuses its heading. Full screen-reader testing and a measured conversion/user study were not performed.

The tests establish the specified behavior. They do not establish that the new journey increases conversion, applicants, hiring quality or employer reputation.
