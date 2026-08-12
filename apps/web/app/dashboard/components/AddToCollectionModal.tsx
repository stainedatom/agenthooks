import React, { useState, useEffect } from "react";
import { X, Plus, FolderPlus, Folder } from "lucide-react";
import { EndpointCollection } from "../../../lib/api";

interface AddToCollectionModalProps {
  isOpen: boolean;
  bulkSelectedCount: number;
  collections: EndpointCollection[];
  onBatchAddToCollection: (collectionId: string) => Promise<void> | void;
  onBatchCreateCollection: (payload: { name: string; description: string }) => Promise<void> | void;
  onGoToCollectionsTab: () => void;
  onClose: () => void;
}

export function AddToCollectionModal({
  isOpen,
  bulkSelectedCount,
  collections,
  onBatchAddToCollection,
  onBatchCreateCollection,
  onGoToCollectionsTab,
  onClose,
}: AddToCollectionModalProps) {
  const [targetCollectionId, setTargetCollectionId] = useState<string | null>(null);
  const [batchNewCollectionOpen, setBatchNewCollectionOpen] = useState(false);
  const [batchNewCollectionName, setBatchNewCollectionName] = useState("");
  const [batchNewCollectionDescription, setBatchNewCollectionDescription] = useState("");
  const [batchCreateLoading, setBatchCreateLoading] = useState(false);
  const [addToCollectionLoading, setAddToCollectionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTargetCollectionId(null);
      setBatchNewCollectionName("");
      setBatchNewCollectionDescription("");
      setBatchNewCollectionOpen(collections.length === 0);
      setBatchCreateLoading(false);
      setAddToCollectionLoading(false);
    }
  }, [isOpen, collections.length]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNewCollectionName.trim()) return;
    setBatchCreateLoading(true);
    try {
      await onBatchCreateCollection({
        name: batchNewCollectionName.trim(),
        description: batchNewCollectionDescription.trim(),
      });
      onClose();
    } finally {
      setBatchCreateLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    if (!targetCollectionId) return;
    setAddToCollectionLoading(true);
    try {
      await onBatchAddToCollection(targetCollectionId);
      onClose();
    } finally {
      setAddToCollectionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden border border-gray-150">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/55">
          <h2 className="text-base font-bold text-gray-900">Add to Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 transition-colors bg-transparent border-0 outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Adding{" "}
            <span className="font-semibold text-gray-900">{bulkSelectedCount}</span>{" "}
            selected endpoint{bulkSelectedCount > 1 ? "s" : ""} to:
          </p>

          {/* Inline "New Collection" create form */}
          {batchNewCollectionOpen ? (
            <form
              onSubmit={handleCreateSubmit}
              className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">
                  Create New Collection
                </label>
                {collections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setBatchNewCollectionOpen(false);
                      setBatchNewCollectionName("");
                      setBatchNewCollectionDescription("");
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Collection name (e.g. Weather Hub)"
                value={batchNewCollectionName}
                onChange={(e) => setBatchNewCollectionName(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                required
                autoFocus={collections.length === 0}
              />
              <textarea
                placeholder="Description (optional)"
                value={batchNewCollectionDescription}
                onChange={(e) => setBatchNewCollectionDescription(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                disabled={batchCreateLoading || !batchNewCollectionName.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer transition-colors border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {batchCreateLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={14} />
                    Create & Add {bulkSelectedCount} endpoint{bulkSelectedCount > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBatchNewCollectionOpen(true);
                setTargetCollectionId(null);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-black border border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 cursor-pointer transition-colors bg-transparent"
            >
              <Plus size={14} />
              New Collection
            </button>
          )}

          {collections.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 mb-3">or</p>
              <button
                onClick={onGoToCollectionsTab}
                className="text-xs font-semibold text-black hover:underline cursor-pointer bg-transparent border-0"
              >
                Go to Collections tab →
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-gray-50/20 max-h-64 overflow-y-auto">
              {collections.map((col) => (
                <label
                  key={col._id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all duration-150 ${
                    targetCollectionId === col._id ? "bg-black/5" : "hover:bg-gray-50/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="batch-collection"
                    checked={targetCollectionId === col._id}
                    onChange={() => setTargetCollectionId(col._id)}
                    className="h-4 w-4 border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <Folder size={16} className="text-gray-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{col.name}</p>
                    <p className="text-xs text-gray-400">
                      {col.endpointIds.length} endpoint{col.endpointIds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddSubmit}
            disabled={!targetCollectionId || addToCollectionLoading}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer transition-colors border-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {addToCollectionLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FolderPlus size={14} />
                Add to Collection
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
