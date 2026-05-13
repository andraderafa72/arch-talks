export type DiffLine = {
  kind: "same" | "add" | "remove";
  value: string;
};

export function buildSimpleLineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const max = Math.max(a.length, b.length);
  const rows: DiffLine[] = [];

  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];

    if (left === right && left !== undefined) {
      rows.push({ kind: "same", value: left });
      continue;
    }

    if (left !== undefined) {
      rows.push({ kind: "remove", value: left });
    }
    if (right !== undefined) {
      rows.push({ kind: "add", value: right });
    }
  }

  return rows;
}
