import React from "react";
import EndpointForm from "../../components/EndpointForm";
import PreviewPanel from "../../components/PreviewPanel";
import StudioHeaderActions from "../../components/StudioHeaderActions";
import { useEndpointStudio } from "../hooks/useEndpointStudio";
import { Endpoint } from "../../../lib/api";

interface EndpointStudioOverlayProps {
  studio: ReturnType<typeof useEndpointStudio>;
  onCreateSuccess: (ep: Endpoint) => void;
  onUpdateSuccess: (ep: Endpoint) => void;
}

export function EndpointStudioOverlay({
  studio,
  onCreateSuccess,
  onUpdateSuccess,
}: EndpointStudioOverlayProps) {
  const {
    mode,
    formValues,
    setFormValues,
    error,
    setError,
    creating,
    updating,
    generatingTemplate,
    generatingJsonata,
    generatingJsonlogic,
    generatingFullPipeline,
    previewHtml,
    previewLoading,
    previewError,
    runPreview,
    generateAiTemplate,
    generateAiJsonata,
    generateAiJsonlogic,
    generateFullAiPipeline,
    close,
    handleCreateSubmit,
    handleUpdateSubmit,
  } = studio;

  if (!mode) return null;

  const isEditMode = mode === "edit";
  const formId = isEditMode ? "edit-endpoint-form" : "create-endpoint-form";

  const onHeaderSave = () => {
    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
  };

  const onSubmit = (e: React.FormEvent) => {
    if (isEditMode) {
      handleUpdateSubmit(e, onUpdateSuccess);
    } else {
      handleCreateSubmit(e, onCreateSuccess);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col animate-in fade-in duration-150 font-sans antialiased text-gray-900 h-screen overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900">
              {isEditMode ? "Endpoint Studio" : "New Endpoint Studio"}
            </h1>
            {isEditMode && (
              <span className="text-xxs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200 shadow-sm animate-pulse">
                Unsaved Draft
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {isEditMode
              ? "Edit and preview changes live before saving to production."
              : "Configure your data sources, script pipelines, templates, and view your widget live."}
          </p>
        </div>
        <StudioHeaderActions
          previewLoading={previewLoading}
          onPreview={runPreview}
          onCancel={close}
          onSave={onHeaderSave}
          saveLabel={isEditMode ? "Save Changes" : "Create Endpoint"}
          savingLabel={isEditMode ? "Saving..." : "Creating..."}
          isSaving={isEditMode ? updating : creating}
        />
      </header>
      <div className="flex-1 flex min-h-0 overflow-hidden bg-gray-100">
        <div className="w-[52%] shrink-0 overflow-y-auto p-6 border-r border-gray-200 flex flex-col gap-6 bg-white shadow-2xs">
          <EndpointForm
            id={formId}
            values={formValues}
            onChange={setFormValues}
            onSubmit={onSubmit}
            error={error}
            onClearError={() => setError("")}
            onGenerateAiTemplate={generateAiTemplate}
            generatingAiTemplate={generatingTemplate}
            onGenerateAiJsonata={generateAiJsonata}
            generatingAiJsonata={generatingJsonata}
            onGenerateAiJsonlogic={generateAiJsonlogic}
            generatingAiJsonlogic={generatingJsonlogic}
            onGenerateFullAiPipeline={generateFullAiPipeline}
            generatingFullPipeline={generatingFullPipeline}
          />
        </div>
        <PreviewPanel
          isEditMode={isEditMode}
          previewHtml={previewHtml}
          previewError={previewError}
          previewLoading={previewLoading}
        />
      </div>
    </div>
  );
}
