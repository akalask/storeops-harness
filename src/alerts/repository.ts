import { randomUUID } from "node:crypto";
import { CreateNotificationInput, Notification } from "./types";

export class AlertsRepository {
  private notifications: Map<string, Notification> = new Map();

  create(input: CreateNotificationInput): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId: input.userId,
      alertType: input.alertType,
      channel: input.channel,
      status: "PENDING",
      message: input.message,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  findForUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }
}
