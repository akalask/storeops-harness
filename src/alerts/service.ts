import { eventBus, StoreOpsEvent } from "../shared/eventBus";
import { AlertsRepository } from "./repository";
import { CreateNotificationInput, Notification } from "./types";

export class AlertsService {
  constructor(private readonly repo: AlertsRepository) {}

  createNotification(input: CreateNotificationInput): Notification {
    return this.repo.create(input);
  }

  listForUser(userId: string): Notification[] {
    return this.repo.findForUser(userId);
  }

  /**
   * Wires this module's reaction to cross-module events. This is the ONLY
   * permitted way alerts learns about things happening in other modules —
   * via eventBus subscriptions, never a direct import of ActivitiesService
   * or ProgrammesService (Section 3.5 "Event bus only").
   *
   * The SLA_BREACH handler is registered here in the baseline so the
   * wiring exists from day one; the *emitting* side (activities module
   * actually firing SLA_BREACH when a task goes overdue) is the feature
   * the harness demonstration run adds — see .harness/reviews/ for that
   * sprint's artifacts.
   */
  registerEventSubscriptions(): void {
    eventBus.on("SLA_BREACH", (event: StoreOpsEvent<{ taskId: string; departmentLeadId: string; storeId: string }>) => {
      this.createNotification({
        userId: event.payload.departmentLeadId,
        alertType: "SLA_BREACH",
        channel: "IN_APP",
        message: `Task ${event.payload.taskId} has breached its SLA.`,
        metadata: { taskId: event.payload.taskId, storeId: event.payload.storeId },
      });
    });

    eventBus.on("SLA_ESCALATION", (event: StoreOpsEvent<{ taskId: string; storeManagerId: string; storeId: string }>) => {
      this.createNotification({
        userId: event.payload.storeManagerId,
        alertType: "ESCALATION",
        channel: "IN_APP",
        message: `Task ${event.payload.taskId} SLA breach escalated — unresolved after grace period.`,
        metadata: { taskId: event.payload.taskId, storeId: event.payload.storeId },
      });
    });
  }
}
