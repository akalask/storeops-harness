/**
 * Service layer — business logic. Owns validation and typed errors.
 * Cross-module side effects MUST go through eventBus.emit(), never a
 * direct import of another module's service (Section 3.5).
 */
import { NoResponsiblePartyError, NotFoundError, ValidationError } from "../shared/errors";
import { eventBus } from "../shared/eventBus";
import { StaffService } from "../staff/service";
import { ActivitiesRepository } from "./repository";
import { CreateTaskInput, Task, TaskCategory, TaskPriority, UpdateTaskInput } from "./types";

const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_CATEGORIES: TaskCategory[] = ["RESTOCKING", "PLANOGRAM", "AUDIT", "COMPLIANCE", "GENERAL"];

export class ActivitiesService {
  constructor(
    private readonly repo: ActivitiesRepository,
    private readonly staffService: StaffService
  ) {}

  createTask(input: CreateTaskInput): Task {
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError("title is required", { title: "must not be empty" });
    }
    if (!VALID_PRIORITIES.includes(input.priority)) {
      throw new ValidationError(`invalid priority: ${input.priority}`);
    }
    if (!VALID_CATEGORIES.includes(input.category)) {
      throw new ValidationError(`invalid category: ${input.category}`);
    }
    const task = this.repo.create(input);
    eventBus.emit("TASK_CREATED", { taskId: task.id, storeId: task.storeId });
    return task;
  }

  getTask(id: string): Task {
    const task = this.repo.findById(id);
    if (!task) throw new NotFoundError(`Task ${id} not found`);
    return task;
  }

  listTasks(filter?: { programmeId?: string; status?: string }): Task[] {
    return this.repo.findAll(filter);
  }

  updateTask(id: string, patch: UpdateTaskInput): Task {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Task ${id} not found`);
    if (patch.priority && !VALID_PRIORITIES.includes(patch.priority)) {
      throw new ValidationError(`invalid priority: ${patch.priority}`);
    }
    if (patch.category && !VALID_CATEGORIES.includes(patch.category)) {
      throw new ValidationError(`invalid category: ${patch.category}`);
    }
    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundError(`Task ${id} not found`);
    eventBus.emit("TASK_UPDATED", { taskId: updated.id, status: updated.status });
    return updated;
  }

  deleteTask(id: string): void {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Task ${id} not found`);
    this.repo.delete(id);
    eventBus.emit("TASK_DELETED", { taskId: id });
  }

  /**
   * Sprint 1 — SLA breach detection. Finds HIGH/CRITICAL tasks past due
   * and not yet DONE, notifies the Department Lead once per breach.
   */
  checkSlaBreaches(now: Date): void {
    const overdue = this.repo.findOverdueHighPriority(now);
    for (const task of overdue) {
      if (task.slaBreachDetectedAt) continue; // already notified for this breach

      const leads = this.staffService.findUsersByRole(task.storeId, "DEPARTMENT_LEAD");
      if (leads.length === 0) {
        throw new NoResponsiblePartyError(`No Department Lead found for store ${task.storeId}`);
      }

      eventBus.emit("SLA_BREACH", {
        taskId: task.id,
        departmentLeadId: leads[0].id,
        storeId: task.storeId,
      });
      this.repo.markSlaBreachDetected(task.id, now.toISOString());
    }
  }
}
