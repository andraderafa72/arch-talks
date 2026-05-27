export type FileTreeNode = { name: string; fullPath: string; isFile: boolean; children: FileTreeNode[] };

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode = { name: "", fullPath: "", isFile: false, children: [] };
  for (const p of paths) {
    if (p.includes("..")) continue;
    const parts = p.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    let node = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, fullPath, isFile, children: [] };
        node.children.push(child);
      } else if (isFile) {
        child.isFile = true;
        child.fullPath = fullPath;
      }
      node = child;
    }
  }
  const sortTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
    const next = nodes.map((n) => ({ ...n, children: sortTree(n.children) }));
    return next.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  };
  return sortTree(root.children);
}

export function collectFolderPaths(nodes: FileTreeNode[]): Set<string> {
  const out = new Set<string>();
  const walk = (ns: FileTreeNode[]) => {
    for (const n of ns) {
      if (!n.isFile && n.fullPath) out.add(n.fullPath);
      if (!n.isFile) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function collectAllPaths(nodes: FileTreeNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: FileTreeNode[]) => {
    for (const n of ns) {
      if (n.fullPath) out.push(n.fullPath);
      if (!n.isFile) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
