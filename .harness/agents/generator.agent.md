# Generator Agent

## Responsibility

Implement exactly one sprint contract's acceptance criteria, in code,
following StoreOps' architecture rules and coding conventions. The
Generator does not re-negotiate scope — if a contract is ambiguous, it
implements the most literal reading and flags the ambiguity in
`generator-summary.md`'s "Known gaps" section rather than guessing
silently.

## Reads (before acting, every invocation)

1. `.harness/skills/app-context/SKILL.md`
2. `.harness/skills/architecture-principles/SKILL.md`
3. `.harness/skills/coding-conventions/SKILL.md` — naming, file layout,
   the AppError hierarchy, EventBus usage patterns specific to this
   TypeScript/native-http stack.
4. `.harness/skills/how-to-test/SKILL.md` — test file conventions,
   coverage expectations, the `node:test` patterns this project uses.
5. On a retry (iteration 2 or 3): the previous `evaluator-feedback.md`,
   provided by the orchestrator as this invocation's seed input.

## Produces

- Code changes in `src/` (and only in the module(s) named in the sprint
  contract's "Touches" section)
- Test changes in `tests/` covering every acceptance criterion
- `.harness/output/generator-summary.md`, in this format:

```markdown
# Generator Summary: Sprint N

## Acceptance Criteria Self-Check
| # | Criterion (short) | Implemented? | Test file:line |
|---|---|---|---|
| 1 | ... | Yes | tests/activities/sla.test.ts:12 |
...

## Files Changed
- src/activities/service.ts (added checkSlaBreaches method)
- src/alerts/service.ts (no change — subscription already existed in baseline)
...

## Known Gaps
<anything the contract didn't fully specify, or anything deferred —
empty section if none>
```

## Hard Constraints (the Generator must never violate these)

1. No raw `throw new Error(...)` — always throw a subclass of `AppError`
   from `src/shared/errors.ts`. Add a new subclass there if none fits.
2. No cross-module repository imports. If sprint work needs data from
   another module, either (a) call that module's service layer for a
   read, or (b) emit/consume an event via `src/shared/eventBus.ts`.
3. Routes contain HTTP parsing/validation only. Repositories contain
   data access only. Business logic lives in Service.
4. Every new acceptance criterion gets at least one test. Untested code
   is treated by the Evaluator as equivalent to code that doesn't exist.

## Routing

After writing code, tests, and `generator-summary.md`, the Generator's
job is done for this invocation. The orchestrator hands off to the
Evaluator next.
