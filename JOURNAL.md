# Architecture Journal

Chronological notes captured during the build, kept separate from
`DESIGN_BRIEF.md` (which is the polished, structured version of the
same reasoning) because some of what mattered here was the *order*
things were discovered in, not just the final conclusions.

## Entry 1 — The network constraint changed everything before any code existed

Before writing a single module, `npm ping` returned a 403 and
`npm list -g` showed no Express, Jest, or ESLint anywhere on disk. This
wasn't a minor inconvenience to work around quietly — it meant the
capstone's literal stack table (Section 3.2) was simply unavailable in
this environment. The fork in the road was: fake it (write code that
*looks* like it would work with those packages, never actually run it)
or build something smaller that's real. I asked rather than assumed,
because this changes what "verified" means for the entire rest of the
capstone — a harness whose hard gates have never actually executed
isn't really demonstrating non-deterministic-systems-design competency,
it's demonstrating essay-writing about it.

## Entry 2 — Writing the AppError hierarchy before anything else was the right call

`src/shared/errors.ts` and `src/shared/eventBus.ts` went first, before
any module. In hindsight this was correct for a reason I didn't fully
articulate until later: every module's service layer needed to *import*
these two files, so getting their shape right early meant no churn
later. If I'd built `activities` fully first and then retrofitted
`AppError` in, I'd likely have made the same mistake Sprint 1's
Generator iteration 1 made — throwing something ad hoc because there
was no established pattern yet to reach for.

## Entry 3 — The lint script's design constraint: narrow on purpose

`scripts/lint.js` checks exactly five things, by name, each traced to a
specific rule in `architecture-principles/SKILL.md`. I was tempted at
one point to make it a more general "does this look like good
TypeScript" checker — catch unused variables, inconsistent naming, etc.
I didn't, because that's not what ESLint-the-real-tool would have been
configured to check in this specific harness either — the capstone's
own Evaluator hard gates are supposed to be the *StoreOps-specific*
rules, not generic linting. A broader script would have diluted the
signal: "0 violations" should mean "none of the 5 rules that map to the
4 client failure modes were broken," not "the code has no style
opinions I disagree with."

## Entry 4 — Choosing to let Sprint 1 actually fail

I could have written Sprint 1's Generator output correctly on the first
try — I know what the fix looks like before writing the buggy version.
I deliberately wrote the flawed version first anyway, because a harness
demonstration where every check conveniently passes on iteration 1
proves nothing about whether the Evaluator's hard gates actually catch
anything. The value of `sprint-1-evaluator-feedback.md`'s iteration-1
entry is that the FAIL verdict, the lint violation, and the failing
test are all *real output from real commands run against real code*,
not a narrated scenario. This cost more effort than writing it right
the first time would have — but "the harness works" is a claim that
needs a failure case in evidence, not just a success case.

## Entry 5 — Finding the demonstration-endpoint gap after the fact

I didn't notice that neither sprint contract accounted for Section
3.4's "demonstrable via a live endpoint" requirement until I tried to
actually curl the feature and realized there was nothing to curl. This
is recorded honestly in `REFLECTION.md` rather than quietly patched
over, because it's a genuinely useful data point about where this
specific harness design's Planner guidance has a blind spot: sprint
contracts are scoped against the *feature's* acceptance criteria, not
against the capstone's *external* demonstrability requirement, and
nothing in `sprint-decomposition/SKILL.md` currently tells the Planner
to check for that category of requirement before finalizing a sprint's
scope boundaries. That's a real, fixable gap for a future revision of
that skill file — which I'm noting here rather than only in
`REFLECTION.md`, because it's exactly the kind of "trend after N
occurrences" observation `.harness/reviews/` is meant to eventually
surface, except this occurrence count is 1 (this journal entry) rather
than something the Monitor agent would have caught on its own this
early.
