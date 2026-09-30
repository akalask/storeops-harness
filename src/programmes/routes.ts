import { Router } from "express";
import { ValidationError } from "../shared/errors";
import { ProgrammesService } from "./service";
import { AddMemberInput, CreateProjectInput } from "./types";

export function buildProgrammesRouter(service: ProgrammesService): Router {
  const router = Router();

  // GET /api/programmes (authenticated store's programmes; storeId passed as query for this reference app)
  router.get("/api/programmes", (req, res) => {
    const storeId = req.query.storeId as string | undefined;
    if (!storeId) throw new ValidationError("storeId query parameter is required");
    const projects = service.listForStore(storeId);
    res.status(200).json({ projects });
  });

  // POST /api/programmes
  router.post("/api/programmes", (req, res) => {
    const body = req.body as Partial<CreateProjectInput> | undefined;
    if (!body || !body.storeId || !body.name) {
      throw new ValidationError("storeId and name are required");
    }
    const project = service.createProject({
      storeId: body.storeId,
      name: body.name,
      description: body.description ?? null,
    });
    res.status(201).json({ project });
  });

  // POST /api/programmes/:id/members
  router.post("/api/programmes/:id/members", (req, res) => {
    const body = req.body as Partial<AddMemberInput> | undefined;
    if (!body || !body.userId || !body.role) {
      throw new ValidationError("userId and role are required");
    }
    const project = service.addMember(req.params.id, { userId: body.userId, role: body.role });
    res.status(200).json({ project });
  });

  return router;
}
