# Skill: How To Review

## Purpose

Give the Evaluator a fixed procedure to follow, in order, every time —
so two runs of the Evaluator against the same Generator output produce
the same verdict. The procedure exists specifically to stop the
Evaluator's own LLM judgment from being the source of verdict
variability.

## Procedure (follow in this exact order)

### Step 1 — Run the three automated checks, for real

```
npm run typecheck
npm run lint
npm run test
```

Record the actual exit code of each. Do not estimate or assume — run
them. This is the hard-gate input for Architecture Compliance (see
`evaluation-criteria/SKILL.md`). If any exit code is non-zero, capture
the actual error/violation/failure output verbatim into
`evaluator-feedback.md`'s "Hard Gate Results" section — do not
paraphrase a tsc error or a failing assertion message, quote it.

### Step 2 — Re-read the sprint contract's acceptance criteria

For each criterion, find the specific test (file + line) the Generator
points to in `generator-summary.md`'s self-check table. Open that test
and ask:

1. Does this test exist and actually run (not skipped, not commented out)?
2. Does its assertion check the THEN clause's specific outcome, or just
   that *something* happened (e.g., a 200 status, a non-null return)?
3. Would this test fail if the business rule were subtly wrong but the
   HTTP shape were still correct? (This is the failure-mode-#3 check —
   see `how-to-test/SKILL.md`'s worked example of a weak vs. correct test.)

If (3) is "no," that criterion is **not adequately covered**, even if a
test with a plausible-sounding name exists.

### Step 3 — Confirm layer separation isn't satisfied only "on paper"

`scripts/lint.js`'s `layer-separation` rule only scans import
statements. It cannot catch a Generator that keeps the *import*
boundaries clean but moves business logic into a route handler's
inline closure to dodge the rule's letter while violating its intent.
Skim each changed `routes.ts` file: if there's an `if`/loop containing
more than a one-line existence check or field-presence check, that's
likely business logic that belongs in `service.ts`. Flag it as a
File-Level Feedback item even though the automated lint passed.

### Step 4 — Assign the verdict

Apply the Verdict Rules from `evaluator.agent.md` exactly — do not
average scores subjectively. A single hard-gate failure is FAIL, full
stop, regardless of how clean everything else looks.

### Step 5 — Write feedback the Generator can act on without a human

Every File-Level Feedback item must name: the file, the line (or line
range), what's wrong, and what change would fix it. "Improve error
handling" is not acceptable feedback — "activities/service.ts:47 throws
`new Error(...)` instead of `new ValidationError(...)` — replace with
the ValidationError subclass" is.

## What "Ambiguous" Actually Means Here

Ambiguity is not "I'm not sure this is good code." It's specifically:
the sprint contract's acceptance criterion doesn't specify what should
happen in a case the Generator's code now has to handle (e.g., the
contract says "escalate after a configurable grace period" but doesn't
say what happens if `gracePeriodHours` is 0). When you hit *that* kind
of gap, use the Fallback Note and CONDITIONAL_PASS — don't silently
decide what the contract should have said.
