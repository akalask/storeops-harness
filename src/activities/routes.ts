/**
 * Routes layer — HTTP concerns + request validation ONLY.
 * No business logic here (Section 3.5 "Layer separation").
 */
import { Router } from "../shared/router";
import { ValidationError } from "../shared/errors";
import { ActivitiesService } from "./service";
import { CreateTaskInput, TaskCategory, TaskPriority, UpdateTaskInput } from "./types";

export function buildActivitiesRouter(service: ActivitiesService): Router {
  const router = new Router();

  // GET /api/activities (optional programme and status filters)
  router.get("/api/activities", (req, res) => {
    const tasks = service.listTasks({
      programmeId: req.query.programmeId,
      status: req.query.status,
    });
    res.status(200).json({ tasks });
  });

  // POST /api/activities
  router.post("/api/activities", (req, res) => {
    const body = req.body as Partial<CreateTaskInput> | undefined;
    if (!body || typeof body !== "object") {
      throw new ValidationError("request body is required");
    }
    if (!body.storeId) throw new ValidationError("storeId is required");
    if (!body.title) throw new ValidationError("title is required");
    if (!body.priority) throw new ValidationError("priority is required");
    if (!body.category) throw new ValidationError("category is required");

    const task = service.createTask({
      storeId: body.storeId,
      title: body.title,
      priority: body.priority as TaskPriority,
      category: body.category as TaskCategory,
      programmeId: body.programmeId ?? null,
      assigneeId: body.assigneeId ?? null,
      dueDate: body.dueDate ?? null,
    });
    res.status(201).json({ task });
  });

  // GET /api/activities/:id
  router.get("/api/activities/:id", (req, res) => {
    const task = service.getTask(req.params.id);
    res.status(200).json({ task });
  });

  // PATCH /api/activities/:id
  router.patch("/api/activities/:id", (req, res) => {
    const body = req.body as UpdateTaskInput | undefined;
    if (!body || typeof body !== "object") {
      throw new ValidationError("request body is required");
    }
    const task = service.updateTask(req.params.id, body);
    res.status(200).json({ task });
  });

  // DELETE /api/activities/:id
  router.delete("/api/activities/:id", (req, res) => {
    service.deleteTask(req.params.id);
    res.status(204).json(undefined);
  });

  // POST /api/activities/run-sla-sweep
  // NOT part of either sprint contract (both explicitly scoped this out as a
  // "future concern" — see sprint-1-contract.md and sprint-2-contract.md
  // "Out of Scope" sections). Added afterward, outside the harness's
  // Planner/Generator/Evaluator loop, purely so the SLA feature is
  // demonstrable through the running application per Section 3.4's
  // requirement ("call the new endpoint via curl ... show a successful
  // response"). This is called out explicitly in REFLECTION.md as a
  // deliberate, undocumented-by-a-sprint-contract addition — a real
  // engagement would put this behind its own sprint contract rather than
  // have an architect hand-add it post-hoc.
  router.post("/api/activities/run-sla-sweep", (req, res) => {
    const body = req.body as { gracePeriodHours?: number } | undefined;
    const gracePeriodHours = body?.gracePeriodHours ?? 4;
    service.checkSlaBreaches(new Date());
    service.checkSlaEscalations(new Date(), gracePeriodHours);
    res.status(200).json({ message: "SLA sweep complete", gracePeriodHours });
  });

  return router;
}
