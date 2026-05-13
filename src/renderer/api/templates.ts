import { mapApiTemplate, type ApiTemplateRow } from "@/api/mappers";
import { TemplatePersistenceService } from "@/persistence/services/templatePersistenceService";
import type { TechnicalTemplate } from "@/types";

const templateService = new TemplatePersistenceService();

export async function listTemplates(baseUrl?: string): Promise<TechnicalTemplate[]> {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/api/templates`);
    if (!response.ok) {
      throw new Error(`Failed to load templates (${response.status})`);
    }
    const rows = (await response.json()) as ApiTemplateRow[];
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map(mapApiTemplate);
  }
  return templateService.listTemplates();
}

export type CreateTemplateInput = {
  name: string;
  description: string;
  files: Record<string, string>;
};

export async function createTemplate(
  input: CreateTemplateInput,
  baseUrl?: string,
): Promise<TechnicalTemplate> {
  if (!baseUrl) return templateService.createTemplate(input);

  const response = await fetch(`${baseUrl}/api/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      files: input.files,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & ApiTemplateRow;

  if (!response.ok) {
    throw new Error(payload.error ?? `Failed to create template (${response.status})`);
  }

  return mapApiTemplate(payload as ApiTemplateRow);
}
