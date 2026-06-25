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
  const [newTemplate, setNewTemplate] = useState("");
  const [newScriptType, setNewScriptType] = useState<"none" | "javascript" | "jsonata" | "jsonlogic">("none");
  const [newScriptCode, setNewScriptCode] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMethod, setEditMethod] = useState("GET");
  const [editEndpoint, setEditEndpoint] = useState("");
  const [editTemplate, setEditTemplate] = useState("");
  const [editScriptType, setEditScriptType] = useState<"none" | "javascript" | "jsonata" | "jsonlogic">("none");
  const [editScriptCode, setEditScriptCode] = useState("");
  const [updating, setUpdating] = useState(false);

  // Execute modal / panel
  const [execEndpoint, setExecEndpoint] = useState<Endpoint | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");
  const [execParams, setExecParams] = useState("{}");
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
    try {
      const ep = await createEndpoint({
        description: newDescription,
        method: newMethod,
        endpoint: newEndpoint || undefined,
        template: newTemplate || undefined,
        scriptType: newScriptType,
        scriptCode: newScriptType !== "none" ? newScriptCode : undefined,
      });
      setEndpoints([ep, ...endpoints]);
      setShowCreate(false);
      setNewDescription("");
      setNewMethod("GET");
      setNewEndpoint("");
      setNewTemplate("");
      setNewScriptType("none");
      setNewScriptCode("");
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
      const updated = await updateEndpoint(editId, {
        description: editDescription,
        method: editMethod,
        endpoint: editEndpoint || undefined,
        template: editTemplate || undefined,
        scriptType: editScriptType,
        scriptCode: editScriptType !== "none" ? editScriptCode : undefined,
      });
      setEndpoints(endpoints.map((ep) => (ep._id === editId ? updated : ep)));
      setShowEdit(false);
      setEditId("");
      setEditDescription("");
      setEditMethod("GET");
      setEditEndpoint("");
      setEditTemplate("");
      setEditScriptType("none");
      setEditScriptCode("");
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
    const defaultParams = ep.parameters && Object.keys(ep.parameters).length > 0
      ? JSON.stringify(ep.parameters, null, 2)
      : "{}";
    setExecParams(defaultParams);

    try {
      let parsedParams = {};
      if (defaultParams.trim()) {
        try {
          parsedParams = JSON.parse(defaultParams);
        } catch {
          // Fallback to empty if default is somehow invalid JSON
        }
      }
      const result = await executeEndpoint(ep._id, parsedParams);
      setExecResult(result);
      setEndpoints((prev) =>
        prev.map((item) => (item._id === ep._id ? { ...item, parameters: parsedParams } : item))
      );
      setExecEndpoint((prev) => (prev && prev._id === ep._id ? { ...prev, parameters: parsedParams } : prev));
    } catch (err) {
      setExecError(err instanceof Error ? err.message : "Failed to execute");
    } finally {
      setExecLoading(false);
    }
  }

  async function triggerExecute() {
    if (!execEndpoint) return;
    setExecLoading(true);
    setExecError("");
    setExecResult(null);
    setIframeHeight(300);
    try {
      let parsedParams = {};
      if (execParams.trim()) {
        try {
          parsedParams = JSON.parse(execParams);
        } catch {
          throw new Error("Parameters must be a valid JSON object");
        }
      }
      const result = await executeEndpoint(execEndpoint._id, parsedParams);
      setExecResult(result);
      setEndpoints((prev) =>
        prev.map((item) => (item._id === execEndpoint._id ? { ...item, parameters: parsedParams } : item))
      );
      setExecEndpoint((prev) => (prev ? { ...prev, parameters: parsedParams } : null));
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
            onClick={() => setShowCreate(true)}
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
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
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
                      setEditId(ep._id);
                      setEditDescription(ep.description);
                      setEditMethod(ep.method);
                      setEditEndpoint(ep.endpoint || "");
                      setEditTemplate(ep.template || "");
                      setEditScriptType(ep.scriptType || "none");
                      setEditScriptCode(ep.scriptCode || "");
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
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <h2 className="text-lg font-bold mb-1">New Endpoint</h2>
            <p className="text-sm text-gray-500 mb-6">
              Define logic and a UI template to build your endpoint
            </p>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
                  placeholder="Displays user dashboard summary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Method</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors bg-white cursor-pointer"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

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

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Logic / Scripting Type</label>
                <select
                  value={newScriptType}
                  onChange={(e) => setNewScriptType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors bg-white cursor-pointer"
                >
                  <option value="none">None (Pass-through)</option>
                  <option value="javascript">JavaScript (ES6)</option>
                  <option value="jsonata">JSONata Query</option>
                  <option value="jsonlogic">JSON Logic</option>
                </select>
              </div>

              {newScriptType !== "none" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Script / Logic Code</label>
                    <span className="text-xxs text-gray-400 font-medium font-mono uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                      {newScriptType === "javascript" && "vm syntax"}
                      {newScriptType === "jsonata" && "jsonata query"}
                      {newScriptType === "jsonlogic" && "json logic rules"}
                    </span>
                  </div>
                  <textarea
                    value={newScriptCode}
                    onChange={(e) => setNewScriptCode(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[120px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                    placeholder={
                      newScriptType === "javascript"
                        ? "// JavaScript Engine\n// Access input via 'input' object\n// Assign your final output to 'result'\n\nresult = {\n  summary: `Retrieved ${input.title}`,\n  processedAt: new Date().toISOString()\n};"
                        : newScriptType === "jsonata"
                        ? "/* JSONata transform expression */\n{\n  \"title\": title,\n  \"items\": [items]\n}"
                        : "/* JSON Logic syntax rule */\n{\n  \"if\": [\n    { \">\": [{ \"var\": \"temp\" }, 25] },\n    \"Warm\",\n    \"Cool\"\n  ]\n}"
                    }
                    required
                  />
                  <p className="text-xxs text-gray-400">
                    {newScriptType === "javascript" && "Write plain ES6. Exposes 'input' global; assign output to 'result' variable."}
                    {newScriptType === "jsonata" && "A lightweight JSON query/transformation syntax. Transform input JSON to template format."}
                    {newScriptType === "jsonlogic" && "Safe rule evaluation structure in JSON format. Validates against input JSON."}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Template <span className="text-gray-400 font-normal text-xs">(Handlebars + Tailwind CSS)</span>
                </label>
                <textarea
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors font-mono min-h-[120px]"
                  placeholder={'<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-150">\n  <h2 class="text-xl font-bold text-gray-900">{{title}}</h2>\n  <p class="text-gray-600 mt-2">{{summary}}</p>\n</div>'}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
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
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <h2 className="text-lg font-bold mb-1">Edit Endpoint</h2>
            <p className="text-sm text-gray-500 mb-6">
              Update logic parameters and template layouts
            </p>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
                  placeholder="Displays weather data"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Method</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors bg-white cursor-pointer"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

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

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Logic / Scripting Type</label>
                <select
                  value={editScriptType}
                  onChange={(e) => setEditScriptType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors bg-white cursor-pointer"
                >
                  <option value="none">None (Pass-through)</option>
                  <option value="javascript">JavaScript (ES6)</option>
                  <option value="jsonata">JSONata Query</option>
                  <option value="jsonlogic">JSON Logic</option>
                </select>
              </div>

              {editScriptType !== "none" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Script / Logic Code</label>
                    <span className="text-xxs text-gray-400 font-medium font-mono uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                      {editScriptType === "javascript" && "vm syntax"}
                      {editScriptType === "jsonata" && "jsonata query"}
                      {editScriptType === "jsonlogic" && "json logic rules"}
                    </span>
                  </div>
                  <textarea
                    value={editScriptCode}
                    onChange={(e) => setEditScriptCode(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[120px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                    placeholder={
                      editScriptType === "javascript"
                        ? "// JavaScript Engine\n// Access input via 'input' object\n// Assign your final output to 'result'\n\nresult = {\n  summary: `Retrieved ${input.title}`,\n  processedAt: new Date().toISOString()\n};"
                        : editScriptType === "jsonata"
                        ? "/* JSONata transform expression */\n{\n  \"title\": title,\n  \"items\": [items]\n}"
                        : "/* JSON Logic syntax rule */\n{\n  \"if\": [\n    { \">\": [{ \"var\": \"temp\" }, 25] },\n    \"Warm\",\n    \"Cool\"\n  ]\n}"
                    }
                    required
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Template <span className="text-gray-400 font-normal text-xs">(Handlebars + Tailwind CSS)</span>
                </label>
                <textarea
                  value={editTemplate}
                  onChange={(e) => setEditTemplate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors font-mono min-h-[120px]"
                  placeholder={'<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-150">\n  <h2 class="text-xl font-bold text-gray-900">{{title}}</h2>\n  <p class="text-gray-600 mt-2">{{summary}}</p>\n</div>'}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
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
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mr-2 ${methodColors[execEndpoint.method] || "bg-gray-100 text-gray-700"}`}>
                  {execEndpoint.method}
                </span>
                <h2 className="text-lg font-bold inline-block align-middle">{execEndpoint.description}</h2>
                {execEndpoint.endpoint ? (
                  <p className="text-xs text-gray-400 font-mono mt-1">{execEndpoint.endpoint}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Direct Scripting (No External API URL)</p>
                )}
              </div>
              <button
                onClick={() => { setExecEndpoint(null); setExecResult(null); setExecError(""); }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-2xl leading-none transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Side: Parameters / Execution Trigger */}
              <div className="md:col-span-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Execution Parameters (JSON)
                  </label>
                  <textarea
                    value={execParams}
                    onChange={(e) => setExecParams(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 bg-gray-55 bg-gray-50 text-gray-900 rounded-xl text-xs font-mono h-48 outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner"
                    placeholder={`{
  "param": "value"
}`}
                  />
                </div>
                <button
                  onClick={triggerExecute}
                  disabled={execLoading}
                  className="w-full py-3 bg-black text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 hover:bg-gray-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {execLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Running...
                    </>
                  ) : (
                    "Run / Execute"
                  )}
                </button>
              </div>

              {/* Right Side: Preview Output */}
              <div className="md:col-span-8 flex flex-col min-h-[350px] border border-gray-100 rounded-2xl bg-gray-50/30 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Output Preview
                  </span>
                  {execResult && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Rendered Successfully
                    </span>
                  )}
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-start min-h-0">
                  {execLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
                      </div>
                      <p className="text-sm text-gray-500 mt-4 animate-pulse">Executing script & compiling UI...</p>
                    </div>
                  )}

                  {execError && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl font-bold mb-3">
                        ⚠️
                      </div>
                      <p className="text-sm font-semibold text-red-700 mb-1">Execution Failed</p>
                      <p className="text-xs text-red-600 max-w-sm font-mono whitespace-pre-wrap">{execError}</p>
                    </div>
                  )}

                  {!execLoading && !execError && !execResult && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-gray-400">
                      <span className="text-3xl mb-2">⚙️</span>
                      <p className="text-sm font-medium">Ready to run</p>
                      <p className="text-xs max-w-xs mt-1">Configure your parameters on the left and click 'Run' to render the output.</p>
                    </div>
                  )}

                  {!execLoading && !execError && execResult && (
                    <div className="flex flex-col gap-4 w-full h-full min-h-0">
                      {/* Secure Sandboxed Iframe */}
                      <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm min-h-[300px] flex flex-col">
                        <iframe
                          srcDoc={execResult.html}
                          sandbox="allow-scripts"
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
          </div>
        </div>
      )}
    </div>
  );
}