import type { ApiTemplateRow } from "@/api/mappers";

export type CreateTemplateInput = {
  name: string;
  description: string;
  files: Record<string, string>;
};

export interface TemplateStore {
  listTemplateRows(): Promise<ApiTemplateRow[]>;
  writeTemplateRows(rows: ApiTemplateRow[]): Promise<void>;
  createTemplate?(input: CreateTemplateInput): Promise<ApiTemplateRow>;
}
