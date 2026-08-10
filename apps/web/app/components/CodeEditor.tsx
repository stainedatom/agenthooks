"use client";

import dynamic from "next/dynamic";

// Monaco is heavy (~5MB) and requires the browser `window` object, so we
// lazy-load it on the client only. It's fetched the first time a code
// section is enabled, then cached for subsequent opens.
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full border border-gray-200 bg-gray-50 rounded-lg flex items-center justify-center text-xs text-gray-400 font-mono">
        Loading editor…
      </div>
    ),
  }
);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export default function CodeEditor({
  value,
  onChange,
  language,
  height = "160px",
}: CodeEditorProps) {
  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg shadow-inner">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </div>
  );
}