import { registerAiDiscoveryIpc } from "./ipc/aiDiscovery.ts";
import { registerArchitectureIpc } from "./ipc/architecture.ts";
import { registerLatexIpc } from "./ipc/latex.ts";
import { registerMarkdownToolIpc } from "./ipc/markdownTool.ts";
import { registerShellAndFilesIpc } from "./ipc/shellAndFiles.ts";
import { registerUmlToolIpc } from "./ipc/umlTool.ts";
import { registerUserPreferencesIpc } from "./ipc/userPreferences.ts";
import { registerVaultSkillsIpc } from "./ipc/vaultSkills.ts";
import { registerVaultToolIpc } from "./ipc/vaultTool.ts";
import { registerWorkspaceToolIpc } from "./ipc/workspaceTool.ts";
import { registerSpeechIpc } from "./ipc/speech.ts";

export function registerAllIpc(): void {
  registerSpeechIpc();
  registerLatexIpc();
  registerArchitectureIpc();
  registerShellAndFilesIpc();
  registerUserPreferencesIpc();
  registerAiDiscoveryIpc();
  registerMarkdownToolIpc();
  registerUmlToolIpc();
  registerWorkspaceToolIpc();
  registerVaultToolIpc();
  registerVaultSkillsIpc();
}
