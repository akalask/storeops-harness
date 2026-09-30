# Deployment

## Deployment Target Chosen

**Local Docker** (Section 5.4's minimum accepted option), with the
caveat below stated plainly rather than glossed over.

## What This Sandbox Could and Couldn't Verify

This build environment has **no Docker daemon** (`docker` is not
installed) and **no network egress** to a container registry or a
cloud provider. Both of those are separate constraints from the
"no npm registry access" issue documented in `DESIGN_BRIEF.md` Section
D — this one blocks running Docker itself, not just installing
packages.

**What I could verify here, for real, against the running Node
process directly (not inside a container):**

```
$ node dist/src/server.js &
$ curl -X POST http://localhost:3000/api/activities \
    -d '{"storeId":"store-1","title":"Overdue critical compliance check",
         "priority":"CRITICAL","category":"COMPLIANCE",
         "dueDate":"2026-01-01T00:00:00.000Z"}'
{"task":{"id":"8e0028ba-...","status":"TODO","priority":"CRITICAL", ...}}

$ curl http://localhost:3000/api/alerts?userId=user-dept-lead-1
{"notifications":[]}

$ curl -X POST http://localhost:3000/api/activities/run-sla-sweep \
    -d '{"gracePeriodHours":4}'
{"message":"SLA sweep complete","gracePeriodHours":4}

$ curl http://localhost:3000/api/alerts?userId=user-dept-lead-1
{"notifications":[{"alertType":"SLA_BREACH","message":"Task 8e0028ba-... has breached its SLA.", ...}]}
```

This proves the new feature end-to-end against the actual running
application, exactly as Section 3.4 requires — it's just not wrapped
in a container in this particular run, because the container runtime
itself isn't available here.

**What I could NOT verify here:** that `docker build` and
`docker compose up` succeed against the `Dockerfile`/`docker-compose.yml`
in this repo. Both files are written to the best of my knowledge of a
standard multi-stage Node build, but "written correctly" and "verified
to run" are different claims, and I want to be explicit about which one
this is.

## How To Actually Verify the Docker Path (for you to run)

```bash
cd storeops-harness
docker compose up --build
# wait for "StoreOps API listening on http://localhost:3000"
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{"storeId":"store-1","title":"Test","priority":"CRITICAL","category":"AUDIT","dueDate":"2026-01-01T00:00:00.000Z"}'
curl -X POST http://localhost:3000/api/activities/run-sla-sweep \
  -H "Content-Type: application/json" -d '{"gracePeriodHours":4}'
curl http://localhost:3000/api/alerts?userId=user-dept-lead-1
```

If `docker build` fails on the `npm install --no-save typescript` line
because your machine also can't reach the npm registry for some reason,
that line has `|| true` specifically so the build continues — but in
that case you'd need a locally cached TypeScript, same constraint this
sandbox hit.

## Cloud Deployment

Not attempted — you indicated this wasn't decided and to prioritize
getting the harness itself working first. The application has no
external dependencies (no database, no third-party API calls), so any
of AWS Elastic Beanstalk, Azure App Service, or GCP Cloud Run should
work from the same `Dockerfile` with no additional configuration beyond
setting the `PORT` environment variable each platform expects — happy
to write the specific deployment steps for whichever one you pick, once
you've had a chance to verify the local Docker path actually builds on
your machine.
