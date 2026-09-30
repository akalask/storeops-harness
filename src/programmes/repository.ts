import { randomUUID } from "node:crypto";
import { CreateProjectInput, Project, ProjectMember } from "./types";

export class ProgrammesRepository {
  private projects: Map<string, Project> = new Map();

  create(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      storeId: input.storeId,
      name: input.name,
      description: input.description ?? null,
      members: [],
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }

  findById(id: string): Project | null {
    return this.projects.get(id) ?? null;
  }

  findByStore(storeId: string): Project[] {
    return Array.from(this.projects.values()).filter((p) => p.storeId === storeId);
  }

  addMember(projectId: string, member: ProjectMember): Project | null {
    const existing = this.projects.get(projectId);
    if (!existing) return null;
    const updated: Project = {
      ...existing,
      members: [...existing.members, member],
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(projectId, updated);
    return updated;
  }

  close(projectId: string): Project | null {
    const existing = this.projects.get(projectId);
    if (!existing) return null;
    const updated: Project = { ...existing, status: "CLOSED", updatedAt: new Date().toISOString() };
    this.projects.set(projectId, updated);
    return updated;
  }
}
