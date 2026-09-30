export type NotificationChannel = "IN_APP" | "EMAIL";
export type NotificationStatus = "PENDING" | "SENT" | "READ";
export type AlertType = "INVENTORY" | "SLA_BREACH" | "SHIFT_HANDOVER" | "ESCALATION";

export interface Notification {
  id: string;
  userId: string;
  alertType: AlertType;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  alertType: AlertType;
  channel: NotificationChannel;
  message: string;
  metadata?: Record<string, unknown>;
}
