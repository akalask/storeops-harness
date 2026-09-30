/**
 * In-process event bus for StoreOps.
 *
 * RULE (non-negotiable, see Section 3.5 "Event bus only"):
 * Side effects that cross module boundaries MUST be raised via
 * EventBus.emit() — never by direct service-to-service import.
 *
 * This directly closes failure mode #4 from the client engagement
 * (missing event bus integration — state changes written directly to
 * sibling module repositories).
 *
 * Example of what this prevents:
 *   BAD:  import { NotificationService } from "../alerts/service";
 *         notificationService.send(...)   // <- direct cross-module import
 *   GOOD: eventBus.emit("SLA_BREACH", { taskId, storeId, ... })
 */

export type StoreOpsEventName =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "SLA_BREACH"
  | "SLA_ESCALATION"
  | "PROGRAMME_CLOSED"
  | "REGIONAL_ROLLUP_REQUESTED"
  | "PROGRAMME_MEMBER_ADDED";

export interface StoreOpsEvent<T = unknown> {
  name: StoreOpsEventName;
  payload: T;
  emittedAt: string;
}

type Listener<T = unknown> = (event: StoreOpsEvent<T>) => void | Promise<void>;

export class EventBus {
  private listeners: Map<StoreOpsEventName, Listener[]> = new Map();
  /** In-memory audit log of every event emitted — used by reports/observability. */
  public readonly log: StoreOpsEvent[] = [];

  on<T = unknown>(name: StoreOpsEventName, listener: Listener<T>): void {
    const existing = this.listeners.get(name) ?? [];
    existing.push(listener as Listener);
    this.listeners.set(name, existing);
  }

  emit<T = unknown>(name: StoreOpsEventName, payload: T): void {
    const event: StoreOpsEvent<T> = {
      name,
      payload,
      emittedAt: new Date().toISOString(),
    };
    this.log.push(event as StoreOpsEvent);
    const handlers = this.listeners.get(name) ?? [];
    for (const handler of handlers) {
      // Fire and forget within the request lifecycle; handlers are
      // expected to be fast in-memory operations for this reference app.
      void handler(event);
    }
  }
}

/** Singleton event bus shared across all modules for this process. */
export const eventBus = new EventBus();
