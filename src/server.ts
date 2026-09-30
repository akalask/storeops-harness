import express, { Express } from "express";
import * as http from "node:http";
import { AppError, ValidationError } from "./shared/errors";

import { ActivitiesRepository } from "./activities/repository";
import { ActivitiesService } from "./activities/service";
import { buildActivitiesRouter } from "./activities/routes";

import { ProgrammesRepository } from "./programmes/repository";
import { ProgrammesService } from "./programmes/service";
import { buildProgrammesRouter } from "./programmes/routes";

import { StaffRepository } from "./staff/repository";
import { StaffService } from "./staff/service";

import { AlertsRepository } from "./alerts/repository";
import { AlertsService } from "./alerts/service";
import { buildAlertsRouter } from "./alerts/routes";

import { ReportsRepository } from "./reports/repository";

export function createApp(): Express {
  // --- wire each module's own 3 layers (Section 3.3) ---
  const staffRepo = new StaffRepository();
  const staffService = new StaffService(staffRepo);

  const activitiesRepo = new ActivitiesRepository();
  const activitiesService = new ActivitiesService(activitiesRepo, staffService);

  const programmesRepo = new ProgrammesRepository();
  const programmesService = new ProgrammesService(programmesRepo);

  const alertsRepo = new AlertsRepository();
  const alertsService = new AlertsService(alertsRepo);
  alertsService.registerEventSubscriptions();

  // reports is a structural stub in this baseline (see reports/repository.ts)
  const reportsRepo = new ReportsRepository();
  void reportsRepo;

  const app = express();
  app.use(express.json());
  app.use(buildActivitiesRouter(activitiesService));
  app.use(buildProgrammesRouter(programmesService));
  app.use(buildAlertsRouter(alertsService));

  // simple liveness endpoint, useful for deployment verification
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "StoreOps API",
      status: "ok",
      endpoints: {
        health: "/health",
        activities: "/api/activities",
        programmes: "/api/programmes",
        alerts: "/api/alerts",
      },
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `No route for ${req.method} ${req.path}`,
        statusCode: 404,
      },
    });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const appError = err instanceof SyntaxError ? new ValidationError("request body is required") : err;
    if (appError instanceof AppError) {
      res.status(appError.statusCode).json(appError.toJSON());
      return;
    }
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unexpected error", statusCode: 500 },
    });
  });

  return app;
}

export function startServer(port = 3000): http.Server {
  const app = createApp();
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`StoreOps API listening on http://localhost:${port}`);
  });
  return server;
}

if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  startServer(port);
}
