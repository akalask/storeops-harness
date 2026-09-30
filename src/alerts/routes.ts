import { Router } from "../shared/router";
import { ValidationError } from "../shared/errors";
import { AlertsService } from "./service";

export function buildAlertsRouter(service: AlertsService): Router {
  const router = new Router();

  // GET /api/alerts (authenticated user; userId passed as query for this reference app)
  router.get("/api/alerts", (req, res) => {
    const userId = req.query.userId;
    if (!userId) throw new ValidationError("userId query parameter is required");
    const notifications = service.listForUser(userId);
    res.status(200).json({ notifications });
  });

  return router;
}
