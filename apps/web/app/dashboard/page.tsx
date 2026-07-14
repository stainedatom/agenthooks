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
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  EndpointCollection,
} from "../../lib/api";
import EndpointForm, { EndpointFormValues, defaultFormValues } from "../components/EndpointForm";
import PreviewPanel from "../components/PreviewPanel";
import StudioHeaderActions from "../components/StudioHeaderActions";
import RunModal from "../components/RunModal";
import MethodBadge from "../components/MethodBadge";
import { Folder, Edit, Trash2, X, Plus } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState("");

  // Tab control
  const [activeTab, setActiveTab] = useState<"endpoints" | "collections">("endpoints");

  // Collection states
  const [collections, setCollections] = useState<EndpointCollection[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionModalMode, setCollectionModalMode] = useState<"create" | "edit">("create");
  const [editCollectionId, setEditCollectionId] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<string[]>([]);
  const [endpointSearchQuery, setEndpointSearchQuery] = useState("");

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
        
        // Fetch endpoints and collections in parallel
        const [eps, cols] = await Promise.all([
          listEndpoints(),
          listCollections()
        ]);
        
        setEndpoints(eps);
        setCollections(cols);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!collectionName.trim()) {
      setError("Collection name is required");
      return;
    }
    try {
      const col = await createCollection({
        name: collectionName.trim(),
        description: collectionDescription.trim(),
        endpointIds: selectedEndpointIds,
      });
      setCollections([col, ...collections]);
      setShowCollectionModal(false);
      resetCollectionForm();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    }
  }

  async function handleUpdateCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!editCollectionId) return;
    if (!collectionName.trim()) {
      setError("Collection name is required");
      return;
    }
    try {
      const col = await updateCollection(editCollectionId, {
        name: collectionName.trim(),
        description: collectionDescription.trim(),
        endpointIds: selectedEndpointIds,
      });
      setCollections(collections.map((c) => (c._id === editCollectionId ? col : c)));
      setShowCollectionModal(false);
      resetCollectionForm();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update collection");
    }
  }

  async function handleDeleteCollection(id: string) {
    if (!confirm("Delete this collection?")) return;
    try {
      await deleteCollection(id);
      setCollections(collections.filter((c) => c._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    }
  }

  function resetCollectionForm() {
    setCollectionName("");
    setCollectionDescription("");
    setSelectedEndpointIds([]);
    setEditCollectionId("");
    setEndpointSearchQuery("");
  }

  function openCreateCollectionModal() {
    resetCollectionForm();
    setCollectionModalMode("create");
    setShowCollectionModal(true);
  }

  function openEditCollectionModal(col: EndpointCollection) {
    setCollectionName(col.name);
    setCollectionDescription(col.description || "");
    setSelectedEndpointIds(col.endpointIds || []);
    setEditCollectionId(col._id);
    setCollectionModalMode("edit");
    setShowCollectionModal(true);
  }

  function toggleEndpointSelection(endpointId: string) {
    setSelectedEndpointIds((prev) =>
      prev.includes(endpointId)
        ? prev.filter((id) => id !== endpointId)
        : [...prev, endpointId]
    );
  }



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
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">

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
          {activeTab === "endpoints" ? (
            <button
              onClick={() => { setError(""); setFormValues(defaultFormValues); setShowCreate(true); }}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
            >
              + New Endpoint
            </button>
          ) : (
            <button
              onClick={openCreateCollectionModal}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> New Collection
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 cursor-pointer transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Main content area with tabs ──────────────────────────── */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-150 border border-red-200 text-red-750 p-3 rounded-lg mb-4 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
          </div>
        )}

        {/* ── Tab selection tabs ── */}
        <div className="flex border-b border-gray-200 mb-6 gap-6">
          <button
            onClick={() => { setActiveTab("endpoints"); setError(""); }}
            className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === "endpoints"
                ? "border-black text-black"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Endpoints ({endpoints.length})
          </button>
          <button
            onClick={() => { setActiveTab("collections"); setError(""); }}
            className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === "collections"
                ? "border-black text-black"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Collections ({collections.length})
          </button>
        </div>

        {activeTab === "endpoints" ? (
          endpoints.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-150 shadow-sm">
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
                      className="px-3 py-1.5 text-xs font-medium text-red-650 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          collections.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-155 shadow-sm">
              <Folder className="mx-auto text-gray-300 w-12 h-12 mb-4 animate-pulse" />
              <p className="text-gray-600 text-lg font-semibold mb-1">No collections yet</p>
              <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                Group your endpoints into collections to organize and prepare them for chat.
              </p>
              <button
                onClick={openCreateCollectionModal}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
              >
                + Create Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map((col) => (
                <div
                  key={col._id}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-150 flex flex-col justify-between hover:shadow-md transition-all duration-150"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Folder size={18} className="text-gray-450 shrink-0" />
                      <h3 className="text-sm font-bold text-gray-900 truncate">{col.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[2rem]">
                      {col.description || "No description provided."}
                    </p>
                    
                    {/* Endpoints preview */}
                    <div className="space-y-1.5 mb-4">
                      <span className="text-xxs font-semibold text-gray-450 uppercase tracking-wider">Endpoints ({col.endpointIds.length})</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {col.endpointIds.length === 0 ? (
                          <span className="text-xxs text-gray-400 italic">No endpoints in this collection</span>
                        ) : (() => {
                          const maxVisible = 3;
                          const visibleIds = col.endpointIds.slice(0, maxVisible);
                          const remainingCount = col.endpointIds.length - maxVisible;

                          return (
                            <>
                              {visibleIds.map(id => {
                                const ep = endpoints.find(e => e._id === id);
                                if (!ep) return null;
                                return (
                                  <span key={id} className="text-xxs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-sans font-medium truncate max-w-[150px]" title={ep.description}>
                                    {ep.description}
                                  </span>
                                );
                              })}
                              {remainingCount > 0 && (
                                <span className="text-xxs text-gray-400 px-1 py-0.5 font-sans font-medium">
                                  +{remainingCount} more
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end border-t border-gray-100 pt-4 mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditCollectionModal(col)}
                        className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                        title="Edit Collection"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCollection(col._id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete Collection"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
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

      {/* ── Collection Modal ──────────────────────────────────────── */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden border border-gray-150">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/55">
              <h2 className="text-base font-bold text-gray-900">
                {collectionModalMode === "create" ? "New Collection" : "Edit Collection"}
              </h2>
              <button
                onClick={() => { setShowCollectionModal(false); setError(""); }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 transition-colors bg-transparent border-0 outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={collectionModalMode === "create" ? handleCreateCollection : handleUpdateCollection} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Weather Hub"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Description</label>
                <textarea
                  placeholder="What is this collection for?"
                  value={collectionDescription}
                  onChange={(e) => setCollectionDescription(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Endpoints list with checkboxes */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-500">Select Endpoints</label>
                  {selectedEndpointIds.length > 0 && (
                    <span className="text-xxs font-bold bg-black text-white px-2 py-0.5 rounded-full shadow-sm">
                      {selectedEndpointIds.length} selected
                    </span>
                  )}
                </div>
                
                <input
                  type="text"
                  placeholder="Filter endpoints by description or path..."
                  value={endpointSearchQuery}
                  onChange={(e) => setEndpointSearchQuery(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-black placeholder-gray-400 bg-gray-50/50"
                />

                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 p-1.5 bg-gray-50/20">
                  {endpoints.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No endpoints created yet.</p>
                  ) : (() => {
                    const filtered = endpoints.filter(ep => 
                      ep.description.toLowerCase().includes(endpointSearchQuery.toLowerCase()) || 
                      (ep.endpoint && ep.endpoint.toLowerCase().includes(endpointSearchQuery.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                      return <p className="text-xs text-gray-400 text-center py-4">No endpoints match your query.</p>;
                    }

                    return filtered.map((ep) => {
                      const isSelected = selectedEndpointIds.includes(ep._id);
                      return (
                        <div
                          key={ep._id}
                          onClick={() => toggleEndpointSelection(ep._id)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150 my-0.5 border ${
                            isSelected
                              ? "bg-black/5 border-black/10 font-medium"
                              : "bg-white border-transparent hover:bg-gray-50/80"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by onClick on parent div
                            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{ep.description}</p>
                            <p className="text-xxs font-mono text-gray-450 truncate">{ep.endpoint}</p>
                          </div>
                          <MethodBadge method={ep.method} className="scale-90 shrink-0" />
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => { setShowCollectionModal(false); setError(""); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer transition-colors border-0"
                >
                  {collectionModalMode === "create" ? "Create Collection" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}