"use client";

interface StudioHeaderActionsProps {
  previewLoading: boolean;
  onPreview: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  savingLabel: string;
  isSaving: boolean;
}

export default function StudioHeaderActions({
  previewLoading,
  onPreview,
  onCancel,
  onSave,
  saveLabel,
  savingLabel,
  isSaving,
}: StudioHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPreview}
        disabled={previewLoading}
        className="px-4 py-2 border border-gray-300 hover:border-gray-400 bg-white text-gray-700 rounded-lg text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
      >
        {previewLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Compiling...
          </>
        ) : (
          <>
            <span>▶</span>
            <span>Update Preview</span>
          </>
        )}
      </button>

      <div className="h-6 w-px bg-gray-200" />

      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="px-5 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50 transition-all shadow-md"
      >
        {isSaving ? savingLabel : saveLabel}
      </button>
    </div>
  );
}
