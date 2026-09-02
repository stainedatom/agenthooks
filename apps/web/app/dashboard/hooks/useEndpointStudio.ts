import { useState, useCallback } from "react";
import {
  createEndpoint,
  updateEndpoint,
  previewEndpoint,
  generateTemplate,
  generateScript,
  generateFullPipeline,
  Endpoint,
} from "../../../lib/api";
import { EndpointFormValues, defaultFormValues } from "../../components/EndpointForm";

function getValidationError(values: EndpointFormValues): string | null {
  if (!values.description.trim()) return "Description is required";
  if (values.enableJsonlogic && !values.jsonlogicCode.trim())
    return "JSON Logic rules code is required when enabled";
  if (values.enableJsonata && !values.jsonataCode.trim())
    return "JSONata expression is required when enabled";
  if (values.enableJavascript && !values.javascriptCode.trim())
    return "JavaScript code is required when enabled";
  if (values.enableTemplate && !values.template.trim())
    return "UI Template is required when enabled";
  return null;
}

function parseParams(
  raw: string
): { ok: true; value: Record<string, unknown> | undefined } | { ok: false } {
  if (!raw.trim()) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function prepareSubmitPayload(values: EndpointFormValues) {
  const validationError = getValidationError(values);
  if (validationError) {
    throw new Error(validationError);
  }

  const params = parseParams(values.parameters);
  if (!params.ok) {
    throw new Error("Parameters must be a valid JSON object");
  }

  const {
    description,
    method,
    endpoint,
    enableTemplate,
    template,
    enableDualTemplate,
    templateB,
    enableJavascript,
    javascriptCode,
    enableJsonata,
    jsonataCode,
    enableJsonlogic,
    jsonlogicCode,
  } = values;

  return {
    description,
    method,
    endpoint,
    template: enableTemplate ? template : "",
    templateB: enableTemplate && enableDualTemplate ? templateB : "",
    enableDualTemplate: enableTemplate ? Boolean(enableDualTemplate) : false,
    parameters: params.value,
    javascriptCode: enableJavascript ? javascriptCode : "",
    jsonataCode: enableJsonata ? jsonataCode : "",
    jsonlogicCode: enableJsonlogic ? jsonlogicCode : "",
  };
}

export function useEndpointStudio() {
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState("");
  const [formValues, setFormValues] = useState<EndpointFormValues>(defaultFormValues);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [generatingJsonata, setGeneratingJsonata] = useState(false);
  const [generatingJsonlogic, setGeneratingJsonlogic] = useState(false);
  const [generatingFullPipeline, setGeneratingFullPipeline] = useState(false);
  const [error, setError] = useState("");

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const runPreview = useCallback(async (values: EndpointFormValues) => {
    if (!values.description.trim()) {
      setPreviewError("Description is required to generate a preview");
      return;
    }
    setPreviewLoading(true);
    setPreviewError("");

    let parsedParams: Record<string, unknown> | undefined;
    if (values.parameters.trim()) {
      try {
        parsedParams = JSON.parse(values.parameters);
      } catch {
        setPreviewError("Parameters/Mock Input must be a valid JSON object");
        setPreviewLoading(false);
        return;
      }
    }

    try {
      const result = await previewEndpoint({
        description: values.description,
        method: values.method,
        endpoint: values.endpoint,
        template: values.enableTemplate ? values.template : "",
        templateB: values.enableTemplate && values.enableDualTemplate ? values.templateB : "",
        enableDualTemplate: values.enableTemplate ? Boolean(values.enableDualTemplate) : false,
        parameters: parsedParams,
        javascriptCode: values.enableJavascript ? values.javascriptCode : "",
        jsonataCode: values.enableJsonata ? values.jsonataCode : "",
        jsonlogicCode: values.enableJsonlogic ? values.jsonlogicCode : "",
      });
      setPreviewHtml(result.html);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const openCreate = useCallback(() => {
    setFormValues(defaultFormValues);
    setEditId("");
    setError("");
    setPreviewHtml("");
    setPreviewError("");
    setMode("create");
  }, []);

  const openEdit = useCallback(
    (ep: Endpoint) => {
      const jsCode = ep.javascriptCode || (ep.scriptType === "javascript" ? ep.scriptCode : "");
      const jataCode = ep.jsonataCode || (ep.scriptType === "jsonata" ? ep.scriptCode : "");
      const jlogicCode = ep.jsonlogicCode || (ep.scriptType === "jsonlogic" ? ep.scriptCode : "");
      const templ = ep.template || "";

      const initialValues: EndpointFormValues = {
        description: ep.description,
        method: ep.method,
        endpoint: ep.endpoint || "",
        parameters: ep.parameters ? JSON.stringify(ep.parameters, null, 2) : "",
        enableJavascript: !!jsCode,
        javascriptCode: jsCode || "",
        enableJsonata: !!jataCode,
        jsonataCode: jataCode || "",
        enableJsonlogic: !!jlogicCode,
        jsonlogicCode: jlogicCode || "",
        enableTemplate: !!templ,
        template: templ,
        templateB: ep.templateB || "",
        enableDualTemplate: !!ep.enableDualTemplate,
      };

      setEditId(ep._id);
      setFormValues(initialValues);
      setError("");
      setMode("edit");
      runPreview(initialValues);
    },
    [runPreview]
  );

  const close = useCallback(() => {
    setMode(null);
    setEditId("");
    setFormValues(defaultFormValues);
    setError("");
    setPreviewHtml("");
    setPreviewError("");
  }, []);

  const handleCreateSubmit = useCallback(
    async (e: React.FormEvent, onSuccess: (ep: Endpoint) => void) => {
      e.preventDefault();
      setCreating(true);
      setError("");

      try {
        const payload = prepareSubmitPayload(formValues);
        const ep = await createEndpoint(payload);
        onSuccess(ep);
        close();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create endpoint");
      } finally {
        setCreating(false);
      }
    },
    [formValues, close]
  );

  const handleUpdateSubmit = useCallback(
    async (e: React.FormEvent, onSuccess: (ep: Endpoint) => void) => {
      e.preventDefault();
      if (!editId) return;
      setUpdating(true);
      setError("");

      try {
        const payload = prepareSubmitPayload(formValues);
        const updated = await updateEndpoint(editId, payload);
        onSuccess(updated);
        close();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update endpoint");
      } finally {
        setUpdating(false);
      }
    },
    [editId, formValues, close]
  );

  const generateAiTemplate = useCallback(
    async (target: "A" | "B" = "A") => {
      setGeneratingTemplate(true);
      setError("");
      try {
        const res = await generateTemplate({
          description: formValues.description,
          instruction:
            target === "B"
              ? `${formValues.templatePrompt || formValues.description} (Dark Theme / Alternate Alert State)`
              : formValues.templatePrompt,
          method: formValues.method,
          endpoint: formValues.endpoint,
          parameters: formValues.parameters,
          enableJsonata: formValues.enableJsonata,
          jsonataCode: formValues.jsonataCode,
        });
        const updatedValues = {
          ...formValues,
          enableTemplate: true,
          ...(target === "B" ? { templateB: res.template } : { template: res.template }),
        };
        setFormValues(updatedValues);
        runPreview(updatedValues);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate AI template");
      } finally {
        setGeneratingTemplate(false);
      }
    },
    [formValues, runPreview]
  );

  const generateAiJsonata = useCallback(async () => {
    setGeneratingJsonata(true);
    setError("");
    try {
      const res = await generateScript({
        scriptType: "jsonata",
        description: formValues.description,
        instruction: formValues.jsonataPrompt,
        method: formValues.method,
        endpoint: formValues.endpoint,
        parameters: formValues.parameters,
      });
      const updatedValues = {
        ...formValues,
        enableJsonata: true,
        jsonataCode: res.code,
      };
      setFormValues(updatedValues);
      runPreview(updatedValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI JSONata code");
    } finally {
      setGeneratingJsonata(false);
    }
  }, [formValues, runPreview]);

  const generateAiJsonlogic = useCallback(async () => {
    setGeneratingJsonlogic(true);
    setError("");
    try {
      const res = await generateScript({
        scriptType: "jsonlogic",
        description: formValues.description,
        instruction: formValues.jsonlogicPrompt,
        method: formValues.method,
        endpoint: formValues.endpoint,
        parameters: formValues.parameters,
        enableJsonata: formValues.enableJsonata,
        jsonataCode: formValues.jsonataCode,
      });
      const updatedValues = {
        ...formValues,
        enableJsonlogic: true,
        jsonlogicCode: res.code,
      };
      setFormValues(updatedValues);
      runPreview(updatedValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI JSON Logic code");
    } finally {
      setGeneratingJsonlogic(false);
    }
  }, [formValues, runPreview]);

  const generateFullAiPipeline = useCallback(async () => {
    setGeneratingFullPipeline(true);
    setError("");
    try {
      const res = await generateFullPipeline({
        description: formValues.description,
        instruction: formValues.jsonataPrompt || formValues.templatePrompt,
        method: formValues.method,
        endpoint: formValues.endpoint,
        parameters: formValues.parameters,
      });
      const updatedValues: EndpointFormValues = {
        ...formValues,
        enableJsonata: res.enableJsonata,
        jsonataCode: res.jsonataCode || formValues.jsonataCode,
        enableJsonlogic: res.enableJsonlogic,
        jsonlogicCode: res.jsonlogicCode || formValues.jsonlogicCode,
        enableTemplate: res.enableTemplate,
        template: res.template || formValues.template,
        templateB: res.templateB || formValues.templateB,
        enableDualTemplate: res.enableDualTemplate ?? formValues.enableDualTemplate,
        enableJavascript: res.enableJavascript,
        javascriptCode: res.javascriptCode || formValues.javascriptCode,
      };
      setFormValues(updatedValues);
      runPreview(updatedValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate full AI pipeline");
    } finally {
      setGeneratingFullPipeline(false);
    }
  }, [formValues, runPreview]);

  return {
    mode,
    editId,
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
    runPreview: () => runPreview(formValues),
    generateAiTemplate,
    generateAiJsonata,
    generateAiJsonlogic,
    generateFullAiPipeline,
    openCreate,
    openEdit,
    close,
    handleCreateSubmit,
    handleUpdateSubmit,
  };
}
