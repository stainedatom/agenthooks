"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  executeEndpoint,
  previewEndpoint,
  Endpoint,
  ExecuteResult,
  getMe,
  logout,
  User,
} from "../../lib/api";
import EndpointForm, { EndpointFormValues, defaultFormValues } from "../components/EndpointForm";
import PreviewPanel from "../components/PreviewPanel";
import StudioHeaderActions from "../components/StudioHeaderActions";
import RunModal from "../components/RunModal";
import MethodBadge from "../components/MethodBadge";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState("");

  // Panel visibility
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState("");

  // Shared form state — replaces all previous newX / editX hooks
  const [formValues, setFormValues] = useState<EndpointFormValues>(defaultFormValues);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Live Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Run modal state
  const [execEndpoint, setExecEndpoint] = useState<Endpoint | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const userData = await getMe();
        setUser(userData.user);
        const eps = await listEndpoints();
        setEndpoints(eps);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);


  async function handleRunPreview() {
    if (!formValues.description.trim()) {
      setPreviewError("Description is required to generate a preview");
      return;
    }
    setPreviewLoading(true);
    setPreviewError("");

    let parsedParams: Record<string, unknown> | undefined;
    if (formValues.parameters.trim()) {
      try {
        parsedParams = JSON.parse(formValues.parameters);
      } catch {
        setPreviewError("Parameters/Mock Input must be a valid JSON object");
        setPreviewLoading(false);
        return;
      }
    }

    try {
      const result = await previewEndpoint({
        description: formValues.description,
        method: formValues.method,
        endpoint: formValues.endpoint,
        template: formValues.enableTemplate ? formValues.template : "",
        parameters: parsedParams,
        javascriptCode: formValues.enableJavascript ? formValues.javascriptCode : "",
        jsonataCode: formValues.enableJsonata ? formValues.jsonataCode : "",
        jsonlogicCode: formValues.enableJsonlogic ? formValues.jsonlogicCode : "",
      });
      setPreviewHtml(result.html);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleCreateSubmit() {
    (document.getElementById("create-endpoint-form") as HTMLFormElement | null)?.requestSubmit();
  }
  function handleUpdateSubmit() {
    (document.getElementById("edit-endpoint-form") as HTMLFormElement | null)?.requestSubmit();
  }

  // Auto-run preview when the studio opens
  useEffect(() => {
    if (showEdit && editId) {
      handleRunPreview();
    } else if (showCreate && formValues.description.trim()) {
      handleRunPreview();
    } else {
      setPreviewHtml("");
      setPreviewError("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEdit, editId, showCreate]);

  async function handleLogout() {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  /**
   * Returns a validation error message, or null if the form is valid.
   * Keeping validation pure (no side-effects) makes it easy to test.
   */
  function getValidationError(values: EndpointFormValues): string | null {
    if (!values.description.trim()) return "Description is required";
    if (values.enableJsonlogic && !values.jsonlogicCode.trim()) return "JSON Logic rules code is required when enabled";
    if (values.enableJsonata && !values.jsonataCode.trim()) return "JSONata expression is required when enabled";
    if (values.enableJavascript && !values.javascriptCode.trim()) return "JavaScript code is required when enabled";
    if (values.enableTemplate && !values.template.trim()) return "UI Template is required when enabled";
    return null;
  }

  /**
   * Parses a raw JSON string into a params object.
   * Returns { ok: true, value } on success, or { ok: false } on empty / invalid JSON.
   */
  function parseParams(
    raw: string
  ): { ok: true; value: Record<string, unknown> | undefined } | { ok: false } {
    if (!raw.trim()) return { ok: true, value: undefined };
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false };
    }
  }  /**
   * Validates and prepares the payload for create/update endpoint submission.
   * Throws an error with a user-friendly message if validation or parsing fails.
   */
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
      parameters: params.value,
      javascriptCode: enableJavascript ? javascriptCode : "",
      jsonataCode: enableJsonata ? jsonataCode : "",
      jsonlogicCode: enableJsonlogic ? jsonlogicCode : "",
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const payload = prepareSubmitPayload(formValues);
      const ep = await createEndpoint(payload);
      setEndpoints([ep, ...endpoints]);
      setShowCreate(false);
      setFormValues(defaultFormValues);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create endpoint");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setUpdating(true);
    setError("");

    try {
      const payload = prepareSubmitPayload(formValues);
      const updated = await updateEndpoint(editId, payload);
      setEndpoints(endpoints.map((ep) => (ep._id === editId ? updated : ep)));
      setShowEdit(false);
      setEditId("");
      setFormValues(defaultFormValues);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update endpoint");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this endpoint?")) return;
    try {
      await deleteEndpoint(id);
      setEndpoints(endpoints.filter((ep) => ep._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleExecute(ep: Endpoint) {
    setExecEndpoint(ep);
    setExecLoading(true);
    setExecError("");
    setExecResult(null);
    try {
      const result = await executeEndpoint(ep._id);
      setExecResult(result);
    } catch (err) {
      setExecError(err instanceof Error ? err.message : "Failed to execute");
    } finally {
      setExecLoading(false);
    }
  }

  /** Populates the shared form state from an existing endpoint and opens Edit Studio. */
  function openEditStudio(ep: Endpoint) {
    const jsCode = ep.javascriptCode || (ep.scriptType === "javascript" ? ep.scriptCode : "");
    const jataCode = ep.jsonataCode || (ep.scriptType === "jsonata" ? ep.scriptCode : "");
    const jlogicCode = ep.jsonlogicCode || (ep.scriptType === "jsonlogic" ? ep.scriptCode : "");
    const templ = ep.template || "";

    setEditId(ep._id);
    setFormValues({
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
    });
    setError("");
    setShowEdit(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">

      {/* ── Dashboard header ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="px-3 py-2 text-sm text-gray-600 hover:text-black cursor-pointer transition-colors"
          >
            Chat
          </Link>
          <button
            onClick={() => { setError(""); setFormValues(defaultFormValues); setShowCreate(true); }}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
          >
            + New Endpoint
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 cursor-pointer transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Endpoint list ─────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {endpoints.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">No endpoints yet</p>
            <p className="text-gray-400 text-sm mb-6">
              Create your first endpoint to start generating UI
            </p>
            <button
              onClick={() => { setError(""); setFormValues(defaultFormValues); setShowCreate(true); }}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
            >
              + Create Endpoint
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div
                key={ep._id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <MethodBadge method={ep.method} />
                  <div>
                    <p className="text-sm font-semibold">{ep.description}</p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-md">{ep.endpoint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecute(ep)}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    Run
                  </button>
                  <button
                    onClick={() => openEditStudio(ep)}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ep._id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Create Studio ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col animate-in fade-in duration-150 font-sans antialiased text-gray-900 h-screen overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div>
              <h1 className="text-base font-bold text-gray-900">New Endpoint Studio</h1>
              <p className="text-xs text-gray-500">Configure your data sources, script pipelines, templates, and view your widget live.</p>
            </div>
            <StudioHeaderActions
              previewLoading={previewLoading}
              onPreview={handleRunPreview}
              onCancel={() => { setShowCreate(false); setError(""); }}
              onSave={handleCreateSubmit}
              saveLabel="Create Endpoint"
              savingLabel="Creating..."
              isSaving={creating}
            />
          </header>
          <div className="flex-1 flex min-h-0 overflow-hidden bg-gray-100">
            <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-200 flex flex-col gap-6 bg-white max-w-3xl">
              <EndpointForm
                id="create-endpoint-form"
                values={formValues}
                onChange={setFormValues}
                onSubmit={handleCreate}
                error={error}
                onClearError={() => setError("")}
              />
            </div>
            <PreviewPanel
              isEditMode={false}
              previewHtml={previewHtml}
              previewError={previewError}
              previewLoading={previewLoading}
            />
          </div>
        </div>
      )}

      {/* ── Edit Studio ───────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col animate-in fade-in duration-150 font-sans antialiased text-gray-900 h-screen overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">Endpoint Studio</h1>
                <span className="text-xxs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200 shadow-sm animate-pulse">
                  Unsaved Draft
                </span>
              </div>
              <p className="text-xs text-gray-500">Edit and preview changes live before saving to production.</p>
            </div>
            <StudioHeaderActions
              previewLoading={previewLoading}
              onPreview={handleRunPreview}
              onCancel={() => { setShowEdit(false); setError(""); }}
              onSave={handleUpdateSubmit}
              saveLabel="Save Changes"
              savingLabel="Saving..."
              isSaving={updating}
            />
          </header>
          <div className="flex-1 flex min-h-0 overflow-hidden bg-gray-100">
            <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-200 flex flex-col gap-6 bg-white max-w-3xl">
              <EndpointForm
                id="edit-endpoint-form"
                values={formValues}
                onChange={setFormValues}
                onSubmit={handleUpdate}
                error={error}
                onClearError={() => setError("")}
              />
            </div>
            <PreviewPanel
              isEditMode={true}
              previewHtml={previewHtml}
              previewError={previewError}
              previewLoading={previewLoading}
            />
          </div>
        </div>
      )}

      {/* ── Run Modal ─────────────────────────────────────────────── */}
      {execEndpoint && (
        <RunModal
          endpoint={execEndpoint}
          result={execResult}
          loading={execLoading}
          error={execError}
          onRefresh={() => handleExecute(execEndpoint)}
          onClose={() => { setExecEndpoint(null); setExecResult(null); setExecError(""); }}
        />
      )}
    </div>
  );
}