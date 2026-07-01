"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  executeEndpoint,
  Endpoint,
  ExecuteResult,
  getMe,
  logout,
  User,
} from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newMethod, setNewMethod] = useState("GET");
  const [newEndpoint, setNewEndpoint] = useState("");
  const [newParameters, setNewParameters] = useState("");

  const [newEnableJavascript, setNewEnableJavascript] = useState(false);
  const [newJavascriptCode, setNewJavascriptCode] = useState("");

  const [newEnableJsonata, setNewEnableJsonata] = useState(false);
  const [newJsonataCode, setNewJsonataCode] = useState("");

  const [newEnableJsonlogic, setNewEnableJsonlogic] = useState(false);
  const [newJsonlogicCode, setNewJsonlogicCode] = useState("");

  const [newEnableTemplate, setNewEnableTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState("");

  const [creating, setCreating] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMethod, setEditMethod] = useState("GET");
  const [editEndpoint, setEditEndpoint] = useState("");
  const [editParameters, setEditParameters] = useState("");

  const [editEnableJavascript, setEditEnableJavascript] = useState(false);
  const [editJavascriptCode, setEditJavascriptCode] = useState("");

  const [editEnableJsonata, setEditEnableJsonata] = useState(false);
  const [editJsonataCode, setEditJsonataCode] = useState("");

  const [editEnableJsonlogic, setEditEnableJsonlogic] = useState(false);
  const [editJsonlogicCode, setEditJsonlogicCode] = useState("");

  const [editEnableTemplate, setEditEnableTemplate] = useState(false);
  const [editTemplate, setEditTemplate] = useState("");

  const [updating, setUpdating] = useState(false);

  // Execute modal / panel
  const [execEndpoint, setExecEndpoint] = useState<Endpoint | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");
  const [iframeHeight, setIframeHeight] = useState(300);

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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "resize-iframe" && typeof event.data.height === "number") {
        setIframeHeight(Math.max(150, Math.min(2000, event.data.height)));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    if (!newDescription.trim()) {
      setError("Description is required");
      setCreating(false);
      return;
    }

    if (newEnableJsonlogic && !newJsonlogicCode.trim()) {
      setError("JSON Logic rules code is required when enabled");
      setCreating(false);
      return;
    }

    if (newEnableJsonata && !newJsonataCode.trim()) {
      setError("JSONata expression is required when enabled");
      setCreating(false);
      return;
    }

    if (newEnableJavascript && !newJavascriptCode.trim()) {
      setError("JavaScript code is required when enabled");
      setCreating(false);
      return;
    }

    if (newEnableTemplate && !newTemplate.trim()) {
      setError("UI Template is required when enabled");
      setCreating(false);
      return;
    }

    let parsedParams: Record<string, unknown> | undefined = undefined;
    if (newParameters.trim()) {
      try {
        parsedParams = JSON.parse(newParameters);
      } catch {
        setError("Parameters must be a valid JSON object");
        setCreating(false);
        return;
      }
    }

    try {
      const ep = await createEndpoint({
        description: newDescription,
        method: newMethod,
        endpoint: newEndpoint,
        template: newEnableTemplate ? newTemplate : "",
        parameters: parsedParams,
        javascriptCode: newEnableJavascript ? newJavascriptCode : "",
        jsonataCode: newEnableJsonata ? newJsonataCode : "",
        jsonlogicCode: newEnableJsonlogic ? newJsonlogicCode : "",
      });
      setEndpoints([ep, ...endpoints]);
      setShowCreate(false);
      setNewDescription("");
      setNewMethod("GET");
      setNewEndpoint("");
      setNewTemplate("");
      setNewEnableTemplate(false);
      setNewEnableJavascript(false);
      setNewJavascriptCode("");
      setNewEnableJsonata(false);
      setNewJsonataCode("");
      setNewEnableJsonlogic(false);
      setNewJsonlogicCode("");
      setNewParameters("");
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

    if (!editDescription.trim()) {
      setError("Description is required");
      setUpdating(false);
      return;
    }

    if (editEnableJsonlogic && !editJsonlogicCode.trim()) {
      setError("JSON Logic rules code is required when enabled");
      setUpdating(false);
      return;
    }

    if (editEnableJsonata && !editJsonataCode.trim()) {
      setError("JSONata expression is required when enabled");
      setUpdating(false);
      return;
    }

    if (editEnableJavascript && !editJavascriptCode.trim()) {
      setError("JavaScript code is required when enabled");
      setUpdating(false);
      return;
    }

    if (editEnableTemplate && !editTemplate.trim()) {
      setError("UI Template is required when enabled");
      setUpdating(false);
      return;
    }

    let parsedParams: Record<string, unknown> | undefined = undefined;
    if (editParameters.trim()) {
      try {
        parsedParams = JSON.parse(editParameters);
      } catch {
        setError("Parameters must be a valid JSON object");
        setUpdating(false);
        return;
      }
    }

    try {
      const updated = await updateEndpoint(editId, {
        description: editDescription,
        method: editMethod,
        endpoint: editEndpoint,
        template: editEnableTemplate ? editTemplate : "",
        parameters: parsedParams,
        javascriptCode: editEnableJavascript ? editJavascriptCode : "",
        jsonataCode: editEnableJsonata ? editJsonataCode : "",
        jsonlogicCode: editEnableJsonlogic ? editJsonlogicCode : "",
      });
      setEndpoints(endpoints.map((ep) => (ep._id === editId ? updated : ep)));
      setShowEdit(false);
      setEditId("");
      setEditDescription("");
      setEditMethod("GET");
      setEditEndpoint("");
      setEditTemplate("");
      setEditEnableTemplate(false);
      setEditEnableJavascript(false);
      setEditJavascriptCode("");
      setEditEnableJsonata(false);
      setEditJsonataCode("");
      setEditEnableJsonlogic(false);
      setEditJsonlogicCode("");
      setEditParameters("");
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
    setIframeHeight(300);

    try {
      const result = await executeEndpoint(ep._id);
      setExecResult(result);
    } catch (err) {
      setExecError(err instanceof Error ? err.message : "Failed to execute");
    } finally {
      setExecLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const methodColors: Record<string, string> = {
    GET: "bg-green-100 text-green-800",
    POST: "bg-blue-100 text-blue-800",
    PUT: "bg-orange-100 text-orange-800",
    PATCH: "bg-yellow-100 text-yellow-800",
    DELETE: "bg-red-100 text-red-800",
    NONE: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      {/* Header */}
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
          <button
            onClick={() => { setError(""); setShowCreate(true); }}
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

      {/* Main content */}
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
              onClick={() => { setError(""); setShowCreate(true); }}
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
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${methodColors[ep.method] || "bg-gray-100 text-gray-700"}`}
                  >
                    {ep.method}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{ep.description}</p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-md">
                      {ep.endpoint}
                    </p>
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
                    onClick={() => {
                      const jsCode = ep.javascriptCode || (ep.scriptType === "javascript" ? ep.scriptCode : "");
                      const jataCode = ep.jsonataCode || (ep.scriptType === "jsonata" ? ep.scriptCode : "");
                      const jlogicCode = ep.jsonlogicCode || (ep.scriptType === "jsonlogic" ? ep.scriptCode : "");
                      const templ = ep.template || "";

                      setEditId(ep._id);
                      setEditDescription(ep.description);
                      setEditMethod(ep.method);
                      setEditEndpoint(ep.endpoint || "");
                      
                      setEditJavascriptCode(jsCode || "");
                      setEditEnableJavascript(!!jsCode);
                      
                      setEditJsonataCode(jataCode || "");
                      setEditEnableJsonata(!!jataCode);
                      
                      setEditJsonlogicCode(jlogicCode || "");
                      setEditEnableJsonlogic(!!jlogicCode);

                      setEditTemplate(templ);
                      setEditEnableTemplate(!!templ);

                      setEditParameters(ep.parameters ? JSON.stringify(ep.parameters, null, 2) : "");
                      setError("");
                      setShowEdit(true);
                    }}
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">New Endpoint</h2>
              <p className="text-xs text-gray-500 mt-1">Configure your API source, optional scripting logic, and UI layout in one place.</p>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <span className="text-sm">⚠️</span>
                  <span className="flex-1">{error}</span>
                  <button 
                    type="button" 
                    onClick={() => setError("")} 
                    className="text-red-400 hover:text-red-600 font-bold ml-2 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Section 1: Data Source */}
              <div className="flex flex-col gap-4">
                <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">🌐 1. Data Source</span>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
                    placeholder="Displays user dashboard summary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">HTTP Method</label>
                  <div className="flex flex-wrap gap-2">
                    {["GET", "POST", "PUT", "PATCH", "DELETE", "NONE"].map((m) => {
                      const isActive = newMethod === m;
                      const activeStyles: Record<string, string> = {
                        GET: "bg-green-50 text-green-700 border-green-200 shadow-sm font-semibold",
                        POST: "bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-semibold",
                        PUT: "bg-orange-50 text-orange-700 border-orange-200 shadow-sm font-semibold",
                        PATCH: "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm font-semibold",
                        DELETE: "bg-red-50 text-red-700 border-red-200 shadow-sm font-semibold",
                        NONE: "bg-gray-100 text-gray-700 border-gray-300 shadow-sm font-semibold",
                      };
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setNewMethod(m)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 ${
                            isActive
                              ? activeStyles[m]
                              : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {newMethod !== "NONE" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Endpoint URL <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={newEndpoint}
                      onChange={(e) => setNewEndpoint(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors font-mono"
                      placeholder="https://api.example.com/data"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {newMethod === "NONE" ? "Mock Input Data" : "Parameters"}{" "}
                    <span className="text-gray-400 font-normal text-xs">(Optional JSON)</span>
                  </label>
                  <textarea
                    value={newParameters}
                    onChange={(e) => setNewParameters(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[80px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                    placeholder={
                      newMethod === "NONE"
                        ? '{\n  "terms": 7\n}'
                        : '{\n  "limit": 10,\n  "status": "active"\n}'
                    }
                  />
                  <p className="text-xxs text-gray-400">
                    {newMethod === "NONE"
                      ? "Provide the JSON payload that your script will execute on (accessible as the 'input' object)."
                      : "Provide query or request body parameters in JSON format. These will be automatically sent with the external API call."}
                  </p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Section 2: JSONata Query */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">⚙️ 2. JSONata Transformation</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={newEnableJsonata}
                      onChange={(e) => setNewEnableJsonata(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable JSONata
                  </label>
                </div>
                {newEnableJsonata && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={newJsonataCode}
                      onChange={(e) => setNewJsonataCode(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[100px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                      placeholder={`/* JSONata query to transform input JSON */\n{\n  "title": title,\n  "items": [items]\n}`}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Section 3: JSON Logic */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">🧠 3. JSON Logic Evaluation</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={newEnableJsonlogic}
                      onChange={(e) => setNewEnableJsonlogic(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable JSON Logic
                  </label>
                </div>
                {newEnableJsonlogic && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={newJsonlogicCode}
                      onChange={(e) => setNewJsonlogicCode(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[100px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                      placeholder={`/* JSON Logic rule validation or transformation */\n{\n  "if": [\n    { ">": [{ "var": "temp" }, 25] },\n    "Warm",\n    "Cool"\n  ]\n}`}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Section 4: UI Template */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">🎨 4. UI Template</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={newEnableTemplate}
                      onChange={(e) => setNewEnableTemplate(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable Template
                  </label>
                </div>
                {newEnableTemplate && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={newTemplate}
                      onChange={(e) => setNewTemplate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors font-mono min-h-[120px]"
                      placeholder={`<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-150">\n  <h2 class="text-xl font-bold text-gray-900">{{title}}</h2>\n  <p class="text-gray-600 mt-2">{{summary}}</p>\n</div>`}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Section 5: JavaScript */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">💻 5. JavaScript (Client)</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={newEnableJavascript}
                      onChange={(e) => setNewEnableJavascript(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable JavaScript
                  </label>
                </div>
                {newEnableJavascript && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={newJavascriptCode}
                      onChange={(e) => setNewJavascriptCode(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[120px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                      placeholder={`// Client-side script. Executes directly in the browser iframe.
// Exposes 'data' / 'input' as local variables containing the API response.
let count = 0;
const btn = document.getElementById('counterBtn');
if (btn) {
  btn.addEventListener('click', () => {
    count++;
    btn.textContent = \`Clicked \${count} times\`;
  });
}`}
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 mt-4 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(""); }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 hover:bg-gray-800 transition-colors"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Endpoint</h2>
              <p className="text-xs text-gray-500 mt-1">Modify your API source, scripting logic, and UI layout in one place.</p>
            </div>

            <form onSubmit={handleUpdate} className="flex flex-col gap-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <span className="text-sm">⚠️</span>
                  <span className="flex-1">{error}</span>
                  <button 
                    type="button" 
                    onClick={() => setError("")} 
                    className="text-red-400 hover:text-red-600 font-bold ml-2 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Section 1: Data Source */}
              <div className="flex flex-col gap-4">
                <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">🌐 1. Data Source</span>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
                    placeholder="Displays weather data"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">HTTP Method</label>
                  <div className="flex flex-wrap gap-2">
                    {["GET", "POST", "PUT", "PATCH", "DELETE", "NONE"].map((m) => {
                      const isActive = editMethod === m;
                      const activeStyles: Record<string, string> = {
                        GET: "bg-green-50 text-green-700 border-green-200 shadow-sm font-semibold",
                        POST: "bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-semibold",
                        PUT: "bg-orange-50 text-orange-700 border-orange-200 shadow-sm font-semibold",
                        PATCH: "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm font-semibold",
                        DELETE: "bg-red-50 text-red-700 border-red-200 shadow-sm font-semibold",
                        NONE: "bg-gray-100 text-gray-700 border-gray-300 shadow-sm font-semibold",
                      };
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEditMethod(m)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 ${
                            isActive
                              ? activeStyles[m]
                              : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editMethod !== "NONE" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Endpoint URL <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={editEndpoint}
                      onChange={(e) => setEditEndpoint(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors font-mono"
                      placeholder="https://api.example.com/data"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {editMethod === "NONE" ? "Mock Input Data" : "Parameters"}{" "}
                    <span className="text-gray-400 font-normal text-xs">(Optional JSON)</span>
                  </label>
                  <textarea
                    value={editParameters}
                    onChange={(e) => setEditParameters(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[80px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                    placeholder={
                      editMethod === "NONE"
                        ? '{\n  "terms": 7\n}'
                        : '{\n  "limit": 10,\n  "status": "active"\n}'
                    }
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Section 2: JSONata Query */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">⚙️ 2. JSONata Transformation</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={editEnableJsonata}
                      onChange={(e) => setEditEnableJsonata(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable JSONata
                  </label>
                </div>
                {editEnableJsonata && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={editJsonataCode}
                      onChange={(e) => setEditJsonataCode(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[100px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                      placeholder={`/* JSONata query to transform input JSON */\n{\n  "title": title,\n  "items": [items]\n}`}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Section 3: JSON Logic */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">🧠 3. JSON Logic Evaluation</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={editEnableJsonlogic}
                      onChange={(e) => setEditEnableJsonlogic(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable JSON Logic
                  </label>
                </div>
                {editEnableJsonlogic && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={editJsonlogicCode}
                      onChange={(e) => setEditJsonlogicCode(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[100px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                      placeholder={`/* JSON Logic rule validation or transformation */\n{\n  "if": [\n    { ">": [{ "var": "temp" }, 25] },\n    "Warm",\n    "Cool"\n  ]\n}`}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Section 4: UI Template */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">🎨 4. UI Template</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={editEnableTemplate}
                      onChange={(e) => setEditEnableTemplate(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable Template
                  </label>
                </div>
                {editEnableTemplate && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={editTemplate}
                      onChange={(e) => setEditTemplate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors font-mono min-h-[120px]"
                      placeholder={`<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-150">\n  <h2 class="text-xl font-bold text-gray-900">{{title}}</h2>\n  <p class="text-gray-600 mt-2">{{summary}}</p>\n</div>`}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Section 5: JavaScript */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">💻 5. JavaScript</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={editEnableJavascript}
                      onChange={(e) => setEditEnableJavascript(e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    Enable JavaScript
                  </label>
                </div>
                {editEnableJavascript && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <textarea
                      value={editJavascriptCode}
                      onChange={(e) => setEditJavascriptCode(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[120px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                      placeholder={`// Client-side script. Executes directly in the browser iframe.
// Exposes 'data' / 'input' as local variables containing the API response.
let count = 0;
const btn = document.getElementById('counterBtn');
if (btn) {
  btn.addEventListener('click', () => {
    count++;
    btn.textContent = \`Clicked \${count} times\`;
  });
}`}
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 mt-4 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEdit(false); setError(""); }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 hover:bg-gray-800 transition-colors"
                >
                  {updating ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Modal */}
      {execEndpoint && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mr-2 ${methodColors[execEndpoint.method] || "bg-gray-100 text-gray-700"}`}>
                  {execEndpoint.method}
                </span>
                <h2 className="text-lg font-bold inline-block align-middle">{execEndpoint.description}</h2>
                <p className="text-xs text-gray-400 font-mono mt-1">{execEndpoint.endpoint}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExecute(execEndpoint)}
                  disabled={execLoading}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  onClick={() => { setExecEndpoint(null); setExecResult(null); setExecError(""); }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer text-2xl leading-none transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-h-0 bg-gray-50/30">
              {execLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-gray-500 mt-4 animate-pulse">Fetching API & compiling layout...</p>
                </div>
              )}

              {execError && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 py-16 bg-white border border-gray-150 rounded-2xl shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl font-bold mb-3">
                    ⚠️
                  </div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Execution Failed</p>
                  <p className="text-xs text-red-600 max-w-md font-mono whitespace-pre-wrap">{execError}</p>
                </div>
              )}

              {!execLoading && !execError && execResult && (
                <div className="flex flex-col gap-4 w-full h-full min-h-0">
                  {/* Secure Sandboxed Iframe */}
                  <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm min-h-[350px] flex flex-col">
                    <iframe
                      srcDoc={execResult.html}
                      sandbox="allow-scripts allow-forms"
                      style={{ height: `${iframeHeight}px` }}
                      className="w-full border-0 transition-all duration-150 block"
                      title="Execution Preview"
                    />
                  </div>

                  {/* Raw Response Data */}
                  <details className="text-xs border border-gray-150 bg-white rounded-xl overflow-hidden shadow-sm">
                    <summary className="cursor-pointer font-semibold px-4 py-3 bg-gray-50 text-gray-700 select-none hover:bg-gray-100 transition-colors flex items-center justify-between">
                      <span>Raw Transformed Data</span>
                      <span className="text-xxs text-gray-400 font-normal">Click to expand</span>
                    </summary>
                    <div className="border-t border-gray-100">
                      <pre className="p-4 overflow-x-auto text-xxs text-gray-700 max-h-60 font-mono bg-gray-50/50">
                        {JSON.stringify(execResult.data, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}