import { NotFoundError, ValidationError } from "../shared/errors";
import { eventBus } from "../shared/eventBus";
import { ProgrammesRepository } from "./repository";
import { AddMemberInput, CreateProjectInput, Project, ProjectRole } from "./types";

const VALID_ROLES: ProjectRole[] = ["STORE_MANAGER", "DEPARTMENT_LEAD", "ASSOCIATE"];

export class ProgrammesService {
  constructor(private readonly repo: ProgrammesRepository) {}

  createProject(input: CreateProjectInput): Project {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError("name is required");
    }
    return this.repo.create(input);
  }

  listForStore(storeId: string): Project[] {
    return this.repo.findByStore(storeId);
  }

  addMember(projectId: string, input: AddMemberInput): Project {
    if (!VALID_ROLES.includes(input.role)) {
      throw new ValidationError(`invalid role: ${input.role}`);
    }
    const updated = this.repo.addMember(projectId, {
      userId: input.userId,
      role: input.role,
      addedAt: new Date().toISOString(),
    });
    if (!updated) throw new NotFoundError(`Programme ${projectId} not found`);
    eventBus.emit("PROGRAMME_MEMBER_ADDED", { projectId, userId: input.userId });
    return updated;
  }

  closeProject(projectId: string): Project {
    const updated = this.repo.close(projectId);
    if (!updated) throw new NotFoundError(`Programme ${projectId} not found`);
    eventBus.emit("PROGRAMME_CLOSED", { projectId });
    return updated;
  }
}
