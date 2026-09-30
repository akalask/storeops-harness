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

  return router;
}
