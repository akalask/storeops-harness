export type ReportType = "STORE_SUMMARY" | "REGIONAL_ROLLUP" | "DEPARTMENT_PERFORMANCE";
export type ReportStatus = "PENDING" | "READY" | "FAILED";

export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatus;
  scopeId: string; // storeId or regionId depending on type
  data: Record<string, unknown> | null;
  createdAt: string;
}
