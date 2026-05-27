import { INTEGRATION_IDS, type IntegrationId } from "../../../shared/integrations.ts";
import type { UiLocale } from "@/types";

export type IntegrationFeature = "uml" | "latex" | "commerce";

export type IntegrationCatalogMeta = {
  id: IntegrationId;
  requiredBy: IntegrationFeature[];
  docsUrl?: string;
};

/** Display-only metadata; start commands are allowlisted in Electron main. */
export const INTEGRATION_CATALOG_META: IntegrationCatalogMeta[] = [
  {
    id: "kroki",
    requiredBy: ["uml"],
    docsUrl: "https://docs.kroki.io/",
  },
  {
    id: "tectonic",
    requiredBy: ["latex"],
    docsUrl: "https://tectonic-typesetting.github.io/",
  },
  {
    id: "plentymarkets",
    requiredBy: ["commerce"],
  },
];

export function listIntegrationCatalogMeta(): IntegrationCatalogMeta[] {
  return INTEGRATION_CATALOG_META.filter((entry) => (INTEGRATION_IDS as readonly string[]).includes(entry.id));
}

export type IntegrationCatalogLabels = {
  title: string;
  description: string;
  startCommandPlaceholder: string;
};

export function integrationCatalogLabels(
  id: IntegrationId,
  locale: UiLocale,
): IntegrationCatalogLabels {
  if (locale === "pt") {
    switch (id) {
      case "kroki":
        return {
          title: "PlantUML (Kroki)",
          description: "Servidor local para pré-visualizar diagramas PlantUML e blocos UML no Markdown.",
          startCommandPlaceholder: "docker run -d --name rag-talks-kroki -p 9080:8000 yuzutech/kroki",
        };
      case "tectonic":
        return {
          title: "LaTeX (Tectonic)",
          description: "Compilação LaTeX offline via Docker para documentos técnicos e a ferramenta LaTeX.",
          startCommandPlaceholder:
            "docker run -d --name rag-talks-tectonic --entrypoint sleep tectonictypesetting/tectonic:latest infinity",
        };
      case "plentymarkets":
        return {
          title: "Plentymarkets",
          description: "Servidor Plentymarkets na sua máquina (configuração futura).",
          startCommandPlaceholder:
            "docker run -d --name rag-talks-plentymarkets <imagem>  # defina imagem e portas",
        };
    }
  }
  switch (id) {
    case "kroki":
      return {
        title: "PlantUML (Kroki)",
        description: "Local server for PlantUML diagram previews and UML blocks in Markdown.",
        startCommandPlaceholder: "docker run -d --name rag-talks-kroki -p 9080:8000 yuzutech/kroki",
      };
    case "tectonic":
      return {
        title: "LaTeX (Tectonic)",
        description: "Offline LaTeX compilation via Docker for technical documents and the LaTeX tool.",
        startCommandPlaceholder:
          "docker run -d --name rag-talks-tectonic --entrypoint sleep tectonictypesetting/tectonic:latest infinity",
      };
    case "plentymarkets":
      return {
        title: "Plentymarkets",
        description: "Plentymarkets server on your machine (configuration coming soon).",
        startCommandPlaceholder:
          "docker run -d --name rag-talks-plentymarkets <image>  # set image and ports",
      };
  }
}
