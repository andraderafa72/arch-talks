export type LatexOutputFormat = "pdf" | "svg";

export type LatexErrorCode = "VALIDATION" | "TIMEOUT" | "TECTONIC" | "IO" | "UNSUPPORTED";

export type LatexRenderRequest = {
  /** Relative path of the entry .tex file (default main.tex). */
  mainFile?: string;
  /** Relative path → UTF-8 source (or base64 for binary assets under assets/). */
  files: Record<string, string>;
  format?: LatexOutputFormat;
  /** Compile timeout in ms (default 10000). */
  timeoutMs?: number;
  /** Optional single-file shorthand: merged as main.tex if files empty. */
  content?: string;
};

export type LatexRenderResult = {
  success: boolean;
  outputPath?: string;
  error?: string;
  code?: LatexErrorCode;
  stderr?: string;
};
