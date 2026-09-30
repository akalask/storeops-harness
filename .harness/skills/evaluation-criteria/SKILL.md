# Skill: Evaluation Criteria

## Purpose

Define the two weighted dimensions the Evaluator scores every sprint
against, their hard gates, and exactly how a variable, LLM-generated
diff gets converted into a binary per-check result.

## Dimension 1 — Architecture Compliance (60%)

**Fully hard-gated.** No LLM judgment call determines this dimension's
score — it is entirely the exit codes of three real commands:

| Check | Command | What it catches |
|---|---|---|
| Type safety | `npm run typecheck` (`tsc --noEmit`) | Any TypeScript type error anywhere in `src/` or `tests/` |
| Architecture rules | `npm run lint` (`scripts/lint.js`) | Module boundary violations, event-bus-only violations, raw `Error` throws, layer-separation violations, read-only-reports violations — the 5 rules in `architecture-principles/SKILL.md`, each mapped 1:1 to a lint rule |
| Tests | `npm run test` (`node --test`) | Any failing test, including any test the Generator itself wrote |

**Hard gate:** any non-zero exit code from any of the three ⇒
**Architecture Compliance = 0, and the overall verdict is FAIL**,
regardless of Dimension 2's score. This cannot be talked down by good
prose in `generator-summary.md`.

Why these three specific commands and not something softer: each one
maps directly to one of the four client failure modes from
`app-context/SKILL.md`. `lint`'s `module-boundary` and `event-bus-only`
rules catch failure modes #1 and #4. `lint`'s `error-contract` rule
catches failure mode #2. `test` (combined with Dimension 2's coverage
check) catches failure mode #3. There is no acceptable "soft" version
of any of these — a module boundary violation is either present in the
diff or it isn't; there's no partial credit for "mostly" respecting the
event bus.

## Dimension 2 — Acceptance Criteria Coverage (40%)

**LLM-assessed, but converted to a binary per-criterion result**, not a
subjective overall impression. For every acceptance criterion in the
sprint contract:

1. Find the test (file + line) `generator-summary.md` claims covers it.
2. Binary check: does that test's assertion verify the criterion's THEN
   clause specifically, or only the response shape? (Procedure in
   `how-to-review/SKILL.md` Step 2.)
3. Score = (criteria with a genuinely verifying test) / (total criteria).

**Partial hard gate within this dimension:** any criterion with *zero*
corresponding test (not "weak," but literally absent) is itself
sufficient for an overall FAIL — see the Verdict Rules in
`evaluator.agent.md`. A criterion with a *weak* test (exists, runs, but
only checks shape) lowers the Dimension 2 score and triggers
CONDITIONAL_PASS rather than FAIL, since the behavior likely works even
though the safety net protecting it is thin.

## Converting Variable LLM Output Into a Deterministic Result

The Evaluator's raw judgment — "is this test good?" — is not
deterministic across runs by default. Two structural choices bound that
variability:

1. **The question asked is narrow and binary**, not "rate this test
   1-10": "would this test still pass if the business rule were wrong
   but the HTTP shape were right?" is a yes/no question about a
   concrete counterfactual, not a holistic quality judgment. Binary
   questions are far more reproducible across independent LLM calls
   than open-ended scoring.
2. **60% of the verdict never touches LLM judgment at all** — it's exit
   codes. Only the remaining 40% has any LLM-assessed component, and
   even that component is decomposed into N independent binary checks
   (one per acceptance criterion) rather than one holistic score,
   which further reduces variance: getting 1 of 5 criteria's
   "weak-or-strong" call wrong shifts the dimension score by 20%, not
   the whole verdict by a coin-flip.

## Fallback When the Evaluator's Own Output Is Ambiguous

See `how-to-review/SKILL.md`'s "What Ambiguous Actually Means Here"
section. The fallback is always **CONDITIONAL_PASS with the ambiguity
named**, never a silent PASS (which would hide a real gap) and never an
automatic FAIL (which would block progress over a contract-writing gap
that isn't the Generator's fault).

## Weights Sum Check

Architecture Compliance (60%) + Acceptance Criteria Coverage (40%) =
**100%**.
