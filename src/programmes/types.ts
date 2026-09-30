export type ProjectRole = "STORE_MANAGER" | "DEPARTMENT_LEAD" | "ASSOCIATE";

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  addedAt: string;
}

export interface Project {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  members: ProjectMember[];
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  storeId: string;
  name: string;
  description?: string | null;
}

export interface AddMemberInput {
  userId: string;
  role: ProjectRole;
}
