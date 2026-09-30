/**
 * Repository layer — data access ONLY. No HTTP concerns, no business rules,
 * no cross-module calls. (See Section 3.5 "Layer separation".)
 */
import { randomUUID } from "node:crypto";
import { CreateTaskInput, Task, UpdateTaskInput } from "./types";

export class ActivitiesRepository {
  private tasks: Map<string, Task> = new Map();

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      storeId: input.storeId,
      programmeId: input.programmeId ?? null,
      title: input.title,
      status: "TODO",
      priority: input.priority,
      category: input.category,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      slaBreachDetectedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  findById(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  findAll(filter?: { programmeId?: string; status?: string }): Task[] {
    let results = Array.from(this.tasks.values());
    if (filter?.programmeId) {
      results = results.filter((t) => t.programmeId === filter.programmeId);
    }
    if (filter?.status) {
      results = results.filter((t) => t.status === filter.status);
    }
    return results;
  }

  update(id: string, patch: UpdateTaskInput): Task | null {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated: Task = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  /** Read-only scan used by the SLA sweep — HIGH/CRITICAL, not DONE, past due. */
  findOverdueHighPriority(now: Date): Task[] {
    return Array.from(this.tasks.values()).filter((t) => {
      if (t.status === "DONE") return false;
      if (t.priority !== "HIGH" && t.priority !== "CRITICAL") return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate).getTime() < now.getTime();
    });
  }

  markSlaBreachDetected(id: string, detectedAt: string): Task | null {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated: Task = { ...existing, slaBreachDetectedAt: detectedAt, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }
}
