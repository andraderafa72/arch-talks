export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Curated allow-list: extend cautiously (TeX packages can enable IO/shell). */
const PACKAGE_WHITELIST = new Set(
  [
    "amsmath",
    "amssymb",
    "amsfonts",
    "amsthm",
    "mathtools",
    "bm",
    "graphicx",
    "graphics",
    "geometry",
    "babel",
    "english",
    "portuguese",
    "american",
    "inputenc",
    "fontenc",
    "lmodern",
    "fontspec",
    "microtype",
    "hyperref",
    "url",
    "xcolor",
    "color",
    "enumitem",
    "booktabs",
    "tabularx",
    "array",
    "caption",
    "subcaption",
    "siunitx",
    "mhchem",
    "chemformula",
    "listings",
    "fancyhdr",
    "etoolbox",
    "ifthen",
    "xifthen",
    "cleveref",
    "nameref",
    "refcount",
    "gettitlestring",
    "tikz",
    "pgf",
    "pgfplots",
    "pgfpages",
    "multicol",
    "wrapfig",
    "csquotes",
    "natbib",
    "biblatex",
    "bidi",
    "polyglossia",
    "xeCJK",
    "lipsum",
    "blindtext",
    "parskip",
    "setspace",
    "titlesec",
    "titling",
    "tocloft",
    "appendix",
    "makeidx",
    "imakeidx",
    "xspace",
    "textcomp",
    "underscore",
  ].map((p) => p.toLowerCase()),
);

const PACKAGE_BLACKLIST = new Set(
  [
    "minted",
    "pythontex",
    "sagetex",
    "gnuplottex",
    "bashful",
    "shellesc",
    "pdf14",
    "auto-pst-pdf",
    "pstool",
    "epstopdf",
    "catchfilebetweentags",
    "exec",
    "runsystem",
  ].map((p) => p.toLowerCase()),
);

const DANGEROUS_SNIPPETS: RegExp[] = [
  /\\write\s*18\b/i,
  /\\immediate\s*\\write\s*18\b/i,
  /\\openout\b/i,
  /\\openin\b/i,
  /\\read\s*[-\d]/i,
  /\\input\s*\{\s*\|/i,
  /\\input\s*\|\s*/i,
  /\\scantokens\b/i,
  /\\catcode\s*`\\|\s*=\s*0/i,
  /\\detokenize\s*\{\s*\\write\s*18/i,
  /\\usepackage\s*\{[^}]*\|\s*/i,
  /\\special\s*\{[^}]*(?:psfile|pdf:|src:)/i,
  /\\pdf(?:mapfile|mapline|shell)\b/i,
  /\\lua(?:exec|load)/i,
  /\\directlua\b/i,
  /\\synctex\s*=\s*1/i,
];

function normalizeRelPath(raw: string): string | null {
  let p = raw.trim().replace(/\\/g, "/");
  p = p.replace(/^\.\/+/, "");
  if (!p || p.includes("..")) {
    return null;
  }
  if (p.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(p)) {
    return null;
  }
  if (/^(https?:|file:)/i.test(p)) {
    return null;
  }
  if (p.includes("|") || p.includes("<") || p.includes(">")) {
    return null;
  }
  return p;
}

function withTexExtension(rel: string): string {
  if (rel.toLowerCase().endsWith(".tex")) {
    return rel;
  }
  return `${rel}.tex`;
}

function fileKeyExists(files: Set<string>, rel: string): boolean {
  if (files.has(rel)) {
    return true;
  }
  if (!rel.toLowerCase().endsWith(".tex") && files.has(`${rel}.tex`)) {
    return true;
  }
  return false;
}

function extractUsepackageNames(tex: string): string[] {
  const out: string[] = [];
  const re = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tex)) !== null) {
    const body = m[1] ?? "";
    for (const part of body.split(",")) {
      const name = part.trim().split(/\s+/)[0]?.trim();
      if (name) {
        out.push(name.toLowerCase());
      }
    }
  }
  return out;
}

function extractInputLikePaths(tex: string, command: string): string[] {
  const paths: string[] = [];
  const re = new RegExp(`\\\\${command}\\s*(?:\\[[^\\]]*\\])?\\s*\\{([^}]+)\\}`, "gs");
  let m: RegExpExecArray | null;
  while ((m = re.exec(tex)) !== null) {
    paths.push(m[1]!.trim());
  }
  return paths;
}

function extractInputIfFileExists(tex: string): string[] {
  const paths: string[] = [];
  const re = /\\InputIfFileExists\s*\{([^}]+)\}\s*\{/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tex)) !== null) {
    paths.push(m[1]!.trim());
  }
  return paths;
}

function validateTexContent(tex: string, fileKeys: Set<string>): ValidationResult {
  for (const rx of DANGEROUS_SNIPPETS) {
    rx.lastIndex = 0;
    if (rx.test(tex)) {
      return { ok: false, error: `Blocked TeX construct matching ${rx}` };
    }
  }

  for (const pkg of extractUsepackageNames(tex)) {
    if (PACKAGE_BLACKLIST.has(pkg)) {
      return { ok: false, error: `Disallowed package: ${pkg}` };
    }
    if (!PACKAGE_WHITELIST.has(pkg)) {
      return { ok: false, error: `Package not on allow-list: ${pkg}` };
    }
  }

  for (const raw of extractInputLikePaths(tex, "input")) {
    const norm = normalizeRelPath(raw);
    if (!norm) {
      return { ok: false, error: `Invalid path in \\input{${raw}}` };
    }
    const candidates = [norm, withTexExtension(norm)];
    if (!candidates.some((c) => fileKeyExists(fileKeys, c))) {
      return { ok: false, error: `Unknown \\input target (not in job files): ${raw}` };
    }
  }
  for (const raw of extractInputLikePaths(tex, "include")) {
    const norm = normalizeRelPath(raw);
    if (!norm) {
      return { ok: false, error: `Invalid path in \\include{${raw}}` };
    }
    const candidates = [withTexExtension(norm)];
    if (!candidates.some((c) => fileKeyExists(fileKeys, c))) {
      return { ok: false, error: `Unknown \\include target (not in job files): ${raw}` };
    }
  }
  for (const raw of extractInputIfFileExists(tex)) {
    const norm = normalizeRelPath(raw);
    if (!norm) {
      return { ok: false, error: `Invalid path in \\InputIfFileExists{${raw}}` };
    }
    const candidates = [norm, withTexExtension(norm)];
    if (!candidates.some((c) => fileKeyExists(fileKeys, c))) {
      return { ok: false, error: `Unknown \\InputIfFileExists target (not in job files): ${raw}` };
    }
  }

  for (const raw of extractInputLikePaths(tex, "includegraphics")) {
    const norm = normalizeRelPath(raw);
    if (!norm) {
      return { ok: false, error: `Invalid path in \\includegraphics{${raw}}` };
    }
    const candidates = [norm, `${norm}.pdf`, `${norm}.png`, `${norm}.jpg`, `${norm}.jpeg`];
    if (!candidates.some((c) => fileKeyExists(fileKeys, c))) {
      return { ok: false, error: `Unknown graphics file (not in job files): ${raw}` };
    }
  }

  for (const raw of extractInputLikePaths(tex, "bibliography")) {
    const norm = normalizeRelPath(raw);
    if (!norm) {
      return { ok: false, error: `Invalid path in \\bibliography{${raw}}` };
    }
    const candidates = [norm, `${norm}.bib`];
    if (!candidates.some((c) => fileKeyExists(fileKeys, c))) {
      return { ok: false, error: `Unknown bibliography file: ${raw}` };
    }
  }

  return { ok: true };
}

export function validateLatex(files: Record<string, string>, mainFile: string): ValidationResult {
  const mainNorm = normalizeRelPath(mainFile);
  if (!mainNorm || !mainNorm.toLowerCase().endsWith(".tex")) {
    return { ok: false, error: "mainFile must be a relative .tex path" };
  }
  if (!fileKeyExists(new Set(Object.keys(files)), mainNorm)) {
    return { ok: false, error: `mainFile not found in files: ${mainFile}` };
  }

  const fileKeys = new Set(Object.keys(files));
  for (const [pathKey, content] of Object.entries(files)) {
    const v = validateTexContent(content, fileKeys);
    if (!v.ok) {
      return { ok: false, error: `${pathKey}: ${v.error}` };
    }
  }
  return { ok: true };
}
