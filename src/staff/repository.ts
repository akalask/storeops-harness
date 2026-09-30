import { randomUUID } from "node:crypto";
import { StaffRole, User } from "./types";

/**
 * StaffRepository is seeded with a handful of reference users so other
 * modules (e.g. activities' SLA escalation) have real Department Leads
 * and Store Managers to resolve against in the demonstration run.
 */
export class StaffRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const now = new Date().toISOString();
    const seedUsers: User[] = [
      {
        id: "user-dept-lead-1",
        storeId: "store-1",
        role: "DEPARTMENT_LEAD",
        profile: { displayName: "Dana Lead", email: "dana.lead@storeops.example" },
        createdAt: now,
      },
      {
        id: "user-store-mgr-1",
        storeId: "store-1",
        role: "STORE_MANAGER",
        profile: { displayName: "Sam Manager", email: "sam.manager@storeops.example" },
        createdAt: now,
      },
      {
        id: "user-associate-1",
        storeId: "store-1",
        role: "ASSOCIATE",
        profile: { displayName: "Ari Associate", email: "ari.associate@storeops.example" },
        createdAt: now,
      },
    ];
    for (const u of seedUsers) this.users.set(u.id, u);
  }

  findById(id: string): User | null {
    return this.users.get(id) ?? null;
  }

  findByRoleInStore(storeId: string, role: StaffRole): User[] {
    return Array.from(this.users.values()).filter((u) => u.storeId === storeId && u.role === role);
  }

  create(storeId: string, role: StaffRole, displayName: string, email: string): User {
    const user: User = {
      id: randomUUID(),
      storeId,
      role,
      profile: { displayName, email },
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }
}
