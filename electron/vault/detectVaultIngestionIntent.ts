const INGEST_PHRASES = [
  "ingest",
  "import",
  "apply to vault",
  "add to vault",
  "vault plan",
  "emit vault",
  "ingestão",
  "ingestao",
  "importar",
  "aplicar ao vault",
  "adicionar ao vault",
  "plano de vault",
  "extrair conhecimento",
  "extract knowledge",
  "apply knowledge",
  "ingest knowledge",
  "populate vault",
  "fill vault",
  "criar notas",
  "create notes from",
];

/** True when the user likely wants the 3-phase ingestion pipeline (not casual chat). */
export function detectVaultIngestionIntent(
  prompt: string,
  referenceExcerpt?: string,
  conversationTranscript?: string,
): boolean {
  const lower = prompt.toLowerCase().trim();
  if (INGEST_PHRASES.some((p) => lower.includes(p))) return true;
  const transcriptLower = conversationTranscript?.toLowerCase().trim() ?? "";
  if (transcriptLower && INGEST_PHRASES.some((p) => transcriptLower.includes(p))) return true;
  if (referenceExcerpt && referenceExcerpt.length > 800) return true;
  return false;
}
