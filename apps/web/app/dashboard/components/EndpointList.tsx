import { FolderPlus } from "lucide-react";
import { Endpoint } from "../../../lib/api";
import MethodBadge from "../../components/MethodBadge";

interface EndpointListProps {
  endpoints: Endpoint[];
  bulkSelectedIds: string[];
  onToggleBulkSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onClearBulkSelection: () => void;
  onOpenAddToCollection: () => void;
  onOpenBulkDelete: () => void;
  onExecute: (ep: Endpoint) => void;
  onEdit: (ep: Endpoint) => void;
  onDelete: (id: string) => void;
  onCreateClick: () => void;
}

export function EndpointList({
  endpoints,
  bulkSelectedIds,
  onToggleBulkSelection,
  onToggleSelectAll,
  onClearBulkSelection,
  onOpenAddToCollection,
  onOpenBulkDelete,
  onExecute,
  onEdit,
  onDelete,
  onCreateClick,
}: EndpointListProps) {
  if (endpoints.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-150 shadow-sm">
        <p className="text-gray-400 text-lg mb-2">No endpoints yet</p>
        <p className="text-gray-400 text-sm mb-6">
          Create your first endpoint to start generating UI
        </p>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
        >
          + Create Endpoint
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Select all + bulk action bar */}
      {bulkSelectedIds.length > 0 ? (
        <div className="flex items-center justify-between bg-black text-white rounded-xl px-4 py-3 mb-3 shadow-sm animate-in slide-in-from-top duration-150">
          <p className="text-sm font-semibold">
            {bulkSelectedIds.length} selected
            {bulkSelectedIds.length < endpoints.length && (
              <button
                onClick={onToggleSelectAll}
                className="ml-2 text-xs font-medium text-gray-300 hover:text-white underline underline-offset-2 cursor-pointer transition-colors bg-transparent border-0"
              >
                Select all {endpoints.length}
              </button>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddToCollection}
              className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 border-0"
            >
              <FolderPlus size={14} />
              Add to Collection
            </button>
            <button
              onClick={onOpenBulkDelete}
              className="px-3 py-1.5 text-xs font-medium bg-red-500/85 hover:bg-red-500 text-white rounded-lg cursor-pointer transition-colors border-0"
            >
              Delete
            </button>
            <button
              onClick={onClearBulkSelection}
              className="px-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors border-0 bg-transparent"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3 px-1">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={endpoints.length > 0 && bulkSelectedIds.length === endpoints.length}
              onChange={onToggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
            />
            Select all ({endpoints.length})
          </label>
        </div>
      )}

      <div className="space-y-3">
        {endpoints.map((ep) => {
          const isRowSelected = bulkSelectedIds.includes(ep._id);
          return (
            <div
              key={ep._id}
              onClick={() => onToggleBulkSelection(ep._id)}
              className={`bg-white rounded-xl p-5 shadow-sm border flex items-center justify-between cursor-pointer transition-all duration-150 group ${
                isRowSelected
                  ? "border-black/30 ring-2 ring-black/5 bg-black/[0.02]"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={isRowSelected}
                  onChange={() => onToggleBulkSelection(ep._id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer shrink-0"
                  title="Select endpoint"
                />
                <MethodBadge method={ep.method} />
                <div>
                  <p className="text-sm font-semibold">{ep.description}</p>
                  <p className="text-xs text-gray-400 font-mono truncate max-w-md">{ep.endpoint}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExecute(ep);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  Run
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(ep);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ep._id);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-650 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
