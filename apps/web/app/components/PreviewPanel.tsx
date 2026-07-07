"use client";

interface PreviewPanelProps {
  isEditMode: boolean;
  previewHtml: string;
  previewError: string;
  previewLoading: boolean;
}

export default function PreviewPanel({
  isEditMode,
  previewHtml,
  previewError,
  previewLoading,
}: PreviewPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 min-h-0 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">
          {isEditMode ? "Interactive Component Preview" : "Live Preview"}
        </span>
        {previewHtml && !previewError && (
          <span className="text-xxs text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Preview Ready
          </span>
        )}
      </div>

      {previewLoading && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm min-h-[350px]">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-150 rounded-full" />
            <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 mt-4 animate-pulse">Running compilation pipelines...</p>
        </div>
      )}

      {previewError && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 py-16 bg-white border border-red-150 rounded-2xl shadow-sm min-h-[350px]">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl font-bold mb-3">
            ⚠️
          </div>
          <p className="text-sm font-semibold text-red-700 mb-1">Preview Execution Failed</p>
          <p className="text-xs text-red-600 max-w-md font-mono whitespace-pre-wrap">{previewError}</p>
        </div>
      )}

      {!previewLoading && !previewError && !previewHtml && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 py-16 bg-white border border-gray-200 rounded-2xl shadow-sm min-h-[350px] border-dashed">
          <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center text-xl font-bold mb-3">
            ▶
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">No Preview Loaded</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Click &quot;Update Preview&quot; to run the compilation pipeline and see your component.
          </p>
        </div>
      )}

      {!previewLoading && !previewError && previewHtml && (
        <div className="flex-1 flex flex-col w-full min-h-0">
          {/* Secure sandboxed iframe — id routes resize-iframe postMessages */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col transition-all">
            <iframe
              id="studio-preview-iframe"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-forms"
              className="w-full flex-1 border-0 block"
              title="Studio Live Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
