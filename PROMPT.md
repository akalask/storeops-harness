# Demonstration Run — Feature Prompt

Invoked as:

```
@planner Add SLA breach alerting: when a HIGH or CRITICAL task passes
its due date without reaching DONE, automatically fire a SLA_BREACH
notification to the assigned Department Lead. If the breach remains
unresolved after a configurable grace period, escalate to the Store
Manager with an ESCALATION notification. This must not re-notify for
the same breach on every check, and must not touch any module's
repository directly — use the event bus for the alerts side effect.
```

This is the "SLA breach alerting" feature from Section 3.4 of the
capstone spec. It was chosen over the other three suggested features
because it most directly exercises the two client failure modes the
standards team was most concerned about (Section 2): raw `Error`
throws bypassing the typed hierarchy, and missing event-bus integration
for cross-module side effects. See DESIGN_BRIEF.md Section D for the
full rationale.
