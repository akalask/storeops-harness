/**
 * Service layer — business logic. Owns validation and typed errors.
 * Cross-module side effects MUST go through eventBus.emit(), never a
 * direct import of another module's service (Section 3.5).
 */
import { NotFoundError, ValidationError } from "../shared/errors";
import { eventBus } from "../shared/eventBus";
import { ActivitiesRepository } from "./repository";
import { CreateTaskInput, Task, TaskCategory, TaskPriority, UpdateTaskInput } from "./types";

const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_CATEGORIES: TaskCategory[] = ["RESTOCKING", "PLANOGRAM", "AUDIT", "COMPLIANCE", "GENERAL"];

export class ActivitiesService {
  constructor(private readonly repo: ActivitiesRepository) {}

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
}
