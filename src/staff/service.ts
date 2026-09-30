/**
 * StaffService exposes READ-ONLY lookups. Other modules may call this
 * service directly (that's the one permitted form of cross-module call —
 * see Section 3.4: "modules may call another module's service layer for
 * read-only lookups"). Nothing outside this module may write to the
 * staff repository.
 */
import { NotFoundError } from "../shared/errors";
import { StaffRepository } from "./repository";
import { StaffRole, User } from "./types";

export class StaffService {
  constructor(private readonly repo: StaffRepository) {}

  getUser(id: string): User {
    const user = this.repo.findById(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return user;
  }

  findUsersByRole(storeId: string, role: StaffRole): User[] {
    return this.repo.findByRoleInStore(storeId, role);
  }
}
