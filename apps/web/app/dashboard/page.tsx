"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe,
  logout,
  refreshToken,
  User,
  listEndpoints,
  createEndpoint,
  deleteEndpoint,
  executeEndpoint,
  Endpoint,
  ExecuteResult,
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
  const [creating, setCreating] = useState(false);

  // Execute modal
  const [execEndpoint, setExecEndpoint] = useState<Endpoint | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        // Check if the session is still valid by refreshing the access token
        await refreshToken();
        const data = await getMe();
        setUser(data.user);
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

  async function handleLogout() {
    try {
      await logout();
      router.push("/");
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
        endpoint: newEndpoint,
        template: newTemplate || undefined,
      });
      setEndpoints([ep, ...endpoints]);
      setShowCreate(false);
      setNewDescription("");
      setNewMethod("GET");
      setNewEndpoint("");
      setNewTemplate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create endpoint");
    } finally {
      setCreating(false);
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">New Endpoint</h2>
            <p className="text-sm text-gray-500 mb-6">
              Connect an external API and define a UI template
            </p>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                  placeholder="Displays weather data"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Method</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors bg-white"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Endpoint URL</label>
                <input
                  type="url"
                  value={newEndpoint}
                  onChange={(e) => setNewEndpoint(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors font-mono"
                  placeholder="https://api.example.com/data"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Template <span className="text-gray-400 font-normal">(Handlebars + Tailwind)</span>
                </label>
                <textarea
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors font-mono min-h-[120px]"
                  placeholder={'<div class="bg-white rounded-xl p-6 shadow-sm">\n  <h2 class="text-xl font-bold">{{title}}</h2>\n  <p class="text-gray-600">{{description}}</p>\n</div>'}
                />
              </div>

              <div className="flex gap-3 mt-2">
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

      {/* Execute Result Modal */}
      {execEndpoint && execResult && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold">{execEndpoint.description}</h2>
                <p className="text-xs text-gray-400 font-mono">{execEndpoint.endpoint}</p>
              </div>
              <button
                onClick={() => { setExecEndpoint(null); setExecResult(null); }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {/* Rendered HTML */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
                <div dangerouslySetInnerHTML={{ __html: execResult.html }} />
              </div>
              {/* Raw Data */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 font-medium mb-2">
                  Raw API Response
                </summary>
                <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-xs text-gray-700 max-h-60">
                  {JSON.stringify(execResult.data, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Execute Loading Modal */}
      {execEndpoint && execLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <p className="text-gray-500">Executing {execEndpoint.description}...</p>
          </div>
        </div>
      )}

      {/* Execute Error */}
      {execEndpoint && execError && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <p className="text-red-600 text-sm mb-4">{execError}</p>
            <button
              onClick={() => { setExecEndpoint(null); setExecError(""); }}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}