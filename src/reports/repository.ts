import { randomUUID } from "node:crypto";
import { Report, ReportType } from "./types";

/**
 * ReportsRepository ONLY stores generated Report records. It never
 * writes to activities/programmes/staff — it may only read from their
 * service layers (Section 3.5 "Read-only reports"). No feature in the
 * current baseline generates reports yet; this module is a structural
 * placeholder ready for a future rollup/summary feature.
 */
export class ReportsRepository {
  private reports: Map<string, Report> = new Map();

  create(type: ReportType, scopeId: string, data: Record<string, unknown> | null): Report {
    const report: Report = {
      id: randomUUID(),
      type,
      status: data ? "READY" : "PENDING",
      scopeId,
      data,
      createdAt: new Date().toISOString(),
    };
    this.reports.set(report.id, report);
    return report;
  }

  findById(id: string): Report | null {
    return this.reports.get(id) ?? null;
  }
}
