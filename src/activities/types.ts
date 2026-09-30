export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskCategory = "RESTOCKING" | "PLANOGRAM" | "AUDIT" | "COMPLIANCE" | "GENERAL";

export interface Task {
  id: string;
  storeId: string;
  programmeId: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId: string | null;
  dueDate: string | null; // ISO date string
  slaBreachDetectedAt: string | null;
  slaEscalatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  storeId: string;
  programmeId?: string | null;
  title: string;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assigneeId?: string | null;
  dueDate?: string | null;
}

