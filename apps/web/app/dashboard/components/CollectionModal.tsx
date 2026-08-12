import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Endpoint, EndpointCollection } from "../../../lib/api";
import MethodBadge from "../../components/MethodBadge";

interface CollectionModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialCollection?: EndpointCollection | null;
  endpoints: Endpoint[];
  onSave: (payload: { name: string; description: string; endpointIds: string[] }) => Promise<void> | void;
  onClose: () => void;
}

export function CollectionModal({
  isOpen,
  mode,
  initialCollection,
  endpoints,
  onSave,
  onClose,
}: CollectionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialCollection) {
        setName(initialCollection.name || "");
        setDescription(initialCollection.description || "");
        setSelectedEndpointIds(initialCollection.endpointIds || []);
      } else {
        setName("");
        setDescription("");
        setSelectedEndpointIds([]);
      }
      setSearchQuery("");
      setLoading(false);
    }
  }, [isOpen, mode, initialCollection]);

  if (!isOpen) return null;

  const toggleEndpoint = (endpointId: string) => {
    setSelectedEndpointIds((prev) =>
      prev.includes(endpointId)
        ? prev.filter((id) => id !== endpointId)
        : [...prev, endpointId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        endpointIds: selectedEndpointIds,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const filteredEndpoints = endpoints.filter(
    (ep) =>
      ep.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.endpoint && ep.endpoint.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden border border-gray-150">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/55">
          <h2 className="text-base font-bold text-gray-900">
            {mode === "create" ? "New Collection" : "Edit Collection"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 transition-colors bg-transparent border-0 outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Name</label>
            <input
              type="text"
              placeholder="e.g. Weather Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Description</label>
            <textarea
              placeholder="What is this collection for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-black placeholder-gray-400 bg-gray-50/50"
            />

            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 p-1.5 bg-gray-50/20">
              {endpoints.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No endpoints created yet.
                </p>
              ) : filteredEndpoints.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No endpoints match your query.
                </p>
              ) : (
                filteredEndpoints.map((ep) => {
                  const isSelected = selectedEndpointIds.includes(ep._id);
                  return (
                    <div
                      key={ep._id}
                      onClick={() => toggleEndpoint(ep._id)}
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
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {ep.description}
                        </p>
                        <p className="text-xxs font-mono text-gray-450 truncate">
                          {ep.endpoint}
                        </p>
                      </div>
                      <MethodBadge method={ep.method} className="scale-90 shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer transition-colors border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "create" ? (
                "Create Collection"
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
