export type BlockPlanRowDraft = {
  id: string;
  hours: string;
  count: string;
};

export type BlockPlanFieldError = "empty" | "invalid";

export type BlockPlanRowValidation = {
  hoursError?: BlockPlanFieldError;
  countError?: BlockPlanFieldError;
};

export function parseHoursDraft(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function parseCountDraft(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

export function validateHoursDraft(value: string): BlockPlanFieldError | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  if (parseHoursDraft(value) === undefined) return "invalid";
  return undefined;
}

export function validateCountDraft(value: string): BlockPlanFieldError | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  if (parseCountDraft(value) === undefined) return "invalid";
  return undefined;
}

export function validateBlockPlanRow(row: Pick<BlockPlanRowDraft, "hours" | "count">): BlockPlanRowValidation {
  return {
    hoursError: validateHoursDraft(row.hours),
    countError: validateCountDraft(row.count),
  };
}

export function validateBlockPlanDrafts(rows: BlockPlanRowDraft[]): {
  valid: boolean;
  rows: BlockPlanRowValidation[];
} {
  const rowValidations = rows.map((row) => validateBlockPlanRow(row));
  const valid =
    rows.length === 0 ||
    rowValidations.every((r) => r.hoursError === undefined && r.countError === undefined);
  return { valid, rows: rowValidations };
}

export function draftsToBlockPlan(rows: BlockPlanRowDraft[]): { hours: number; count: number }[] {
  return rows.flatMap((row) => {
    const hours = parseHoursDraft(row.hours);
    const count = parseCountDraft(row.count);
    if (hours === undefined || count === undefined) return [];
    return [{ hours, count }];
  });
}

export function blockPlanToDrafts(plan: { hours: number; count: number }[] | undefined): BlockPlanRowDraft[] {
  if (!plan?.length) return [];
  return plan.map((spec) => ({
    id: crypto.randomUUID(),
    hours: String(spec.hours),
    count: String(spec.count),
  }));
}
