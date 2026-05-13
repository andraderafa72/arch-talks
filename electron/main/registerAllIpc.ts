import { registerAiDiscoveryIpc } from "./ipc/aiDiscovery.ts";
import { registerArchitectureIpc } from "./ipc/architecture.ts";
import { registerLatexIpc } from "./ipc/latex.ts";
import { registerMarkdownToolIpc } from "./ipc/markdownTool.ts";
import { registerShellAndFilesIpc } from "./ipc/shellAndFiles.ts";
import { registerUmlToolIpc } from "./ipc/umlTool.ts";
import { registerWorkspaceToolIpc } from "./ipc/workspaceTool.ts";

export function registerAllIpc(): void {
  registerLatexIpc();
  registerArchitectureIpc();
  registerShellAndFilesIpc();
  registerAiDiscoveryIpc();
  registerMarkdownToolIpc();
  registerUmlToolIpc();
  registerWorkspaceToolIpc();
}
