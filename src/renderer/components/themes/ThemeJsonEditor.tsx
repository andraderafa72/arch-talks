import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { defineRagTalksMonacoTheme, RAG_TALKS_MONACO_THEME_ID } from "@/lib/monacoTheme";
import { getThemeById } from "@/lib/themeRegistry";
import { useEditorStore } from "@/state/store";
import type { ThemeMode } from "@/types";

type ThemeJsonEditorProps = {
  themeId: string;
  value: string;
  mode: ThemeMode;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onSave?: () => void;
};

export function ThemeJsonEditor({
  themeId,
  value,
  mode,
  readOnly = false,
  onChange,
  onSave,
}: ThemeJsonEditorProps) {
  const saveHandlerRef = useRef(onSave);
  saveHandlerRef.current = onSave;

  const uiThemeId = useEditorStore((s) => s.uiThemeId);
  const customUiThemes = useEditorStore((s) => s.customUiThemes);
  const resolvedUiTheme = getThemeById(uiThemeId, customUiThemes);
  const editorPalette = mode === "dark" ? resolvedUiTheme.dark : resolvedUiTheme.light;
  const fallbackMonacoTheme = mode === "dark" ? "vs-dark" : "vs-light";
  const [monacoTheme, setMonacoTheme] = useState(fallbackMonacoTheme);

  useEffect(() => {
    setMonacoTheme(fallbackMonacoTheme);
  }, [fallbackMonacoTheme]);

  const handleMount = (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    defineRagTalksMonacoTheme(monaco, editorPalette, mode);
    monaco.editor.setTheme(RAG_TALKS_MONACO_THEME_ID);
    setMonacoTheme(RAG_TALKS_MONACO_THEME_ID);
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

  useEffect(() => {
    void import("monaco-editor").then((monaco) => {
      defineRagTalksMonacoTheme(monaco as unknown as Monaco, editorPalette, mode);
      monaco.editor.setTheme(RAG_TALKS_MONACO_THEME_ID);
      setMonacoTheme(RAG_TALKS_MONACO_THEME_ID);
    });
  }, [editorPalette, mode]);

  return (
    <div className="absolute inset-0">
      <Editor
        height="100%"
        width="100%"
        path={`ui-theme/${themeId}.json`}
        language="json"
        value={value}
        theme={monacoTheme}
        onChange={(next) => onChange(next ?? "")}
        onMount={handleMount}
        loading={<div className="h-full w-full bg-[var(--ui-editor-bg)]" />}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          tabSize: 2,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          formatOnPaste: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
