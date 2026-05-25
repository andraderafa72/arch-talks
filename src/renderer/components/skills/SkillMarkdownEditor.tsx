import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";

type SkillMarkdownEditorProps = {
  skillId: string;
  value: string;
  theme: "light" | "dark";
  readOnly?: boolean;
  onChange: (value: string) => void;
  onSave?: () => void;
};

export function SkillMarkdownEditor({
  skillId,
  value,
  theme,
  readOnly = false,
  onChange,
  onSave,
}: SkillMarkdownEditorProps) {
  const saveHandlerRef = useRef(onSave);
  saveHandlerRef.current = onSave;

  const handleMount = (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.layout();
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveHandlerRef.current?.();
      });
    }
  };

  useEffect(() => {
    saveHandlerRef.current = onSave;
  }, [onSave]);

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs-light";

  return (
    <div className="absolute inset-0">
      <Editor
        height="100%"
        width="100%"
      path={`vault-skill/${skillId}.md`}
      language="markdown"
      value={value}
      theme={monacoTheme}
      onChange={(next) => onChange(next ?? "")}
      onMount={handleMount}
      loading={<div className="h-full w-full bg-[#fefefe] dark:bg-zinc-950" />}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
      }}
      />
    </div>
  );
}
