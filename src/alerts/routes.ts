import { Router } from "express";
import { ValidationError } from "../shared/errors";
import { AlertsService } from "./service";

export function buildAlertsRouter(service: AlertsService): Router {
  const router = Router();

  // GET /api/alerts (authenticated user; userId passed as query for this reference app)
  router.get("/api/alerts", (req, res) => {
    const userId = req.query.userId as string | undefined;
    if (!userId) throw new ValidationError("userId query parameter is required");
    const notifications = service.listForUser(userId);
    res.status(200).json({ notifications });
  });

  return router;
}
