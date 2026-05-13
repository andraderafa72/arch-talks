import { mapApiTemplate, type ApiTemplateRow } from "@/api/mappers";
import { getPersistenceProvider } from "@/persistence/createPersistenceProvider";
import type { PersistenceProvider } from "@/persistence/ports/storageProvider";
import type { CreateTemplateInput } from "@/persistence/ports/templateStore";
import { templatesToRows } from "@/persistence/services/serialization";
import type { TechnicalTemplate } from "@/types";

function validateNewTemplateFiles(input: CreateTemplateInput): {
  trimmedName: string;
  trimmedDescription: string;
} {
  const trimmedName = input.name.trim();
  const trimmedDescription = input.description.trim();
  if (!trimmedName) {
    throw new Error("Template name is required.");
  }
  if (!trimmedDescription) {
    throw new Error("Template description is required.");
  }
  if (!input.files || Object.keys(input.files).length === 0) {
    throw new Error("Template files are required.");
  }
  const mainTex = input.files["main.tex"];
  if (!mainTex?.trim()) {
    throw new Error("Template must include a non-empty 'main.tex' file.");
  }
  return { trimmedName, trimmedDescription };
}

export class TemplatePersistenceService {
  private readonly provider: PersistenceProvider;

  constructor(provider: PersistenceProvider = getPersistenceProvider()) {
    this.provider = provider;
  }

  async listTemplates(): Promise<TechnicalTemplate[]> {
    const rows = await this.provider.templates.listTemplateRows();
    return rows.map(mapApiTemplate);
  }

  async writeAll(templates: TechnicalTemplate[], updatedAt = new Date().toISOString()): Promise<void> {
    await this.provider.templates.writeTemplateRows(templatesToRows(templates, updatedAt));
  }

  async createTemplate(input: CreateTemplateInput): Promise<TechnicalTemplate> {
    const { trimmedName, trimmedDescription } = validateNewTemplateFiles(input);

    if (this.provider.templates.createTemplate) {
      const created = await this.provider.templates.createTemplate({
        name: trimmedName,
        description: trimmedDescription,
        files: { ...input.files },
      });
      return mapApiTemplate(created);
    }

    const rows = await this.provider.templates.listTemplateRows();
    if (rows.some((template) => template.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error("A template with this name already exists.");
    }

    const created: ApiTemplateRow = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: trimmedDescription,
      files: { ...input.files },
      updatedAt: new Date().toISOString(),
    };
    await this.provider.templates.writeTemplateRows([...rows, created]);
    return mapApiTemplate(created);
  }
}
