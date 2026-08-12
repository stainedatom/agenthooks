import { Folder, Edit, Trash2 } from "lucide-react";
import { EndpointCollection, Endpoint } from "../../../lib/api";

interface CollectionGridProps {
  collections: EndpointCollection[];
  endpoints: Endpoint[];
  onEditCollection: (col: EndpointCollection) => void;
  onDeleteCollection: (id: string) => void;
  onCreateClick: () => void;
}

export function CollectionGrid({
  collections,
  endpoints,
  onEditCollection,
  onDeleteCollection,
  onCreateClick,
}: CollectionGridProps) {
  if (collections.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-155 shadow-sm">
        <Folder className="mx-auto text-gray-300 w-12 h-12 mb-4 animate-pulse" />
        <p className="text-gray-600 text-lg font-semibold mb-1">No collections yet</p>
        <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
          Group your endpoints into collections to organize and prepare them for chat.
        </p>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors"
        >
          + Create Collection
        </button>
      </div>
    );
  }

  return (
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
              <span className="text-xxs font-semibold text-gray-450 uppercase tracking-wider">
                Endpoints ({col.endpointIds.length})
              </span>
              <div className="flex flex-wrap gap-1 pt-1">
                {col.endpointIds.length === 0 ? (
                  <span className="text-xxs text-gray-400 italic">
                    No endpoints in this collection
                  </span>
                ) : (
                  (() => {
                    const maxVisible = 3;
                    const visibleIds = col.endpointIds.slice(0, maxVisible);
                    const remainingCount = col.endpointIds.length - maxVisible;

                    return (
                      <>
                        {visibleIds.map((id: string) => {
                          const ep = endpoints.find((e) => e._id === id);
                          if (!ep) return null;
                          return (
                            <span
                              key={id}
                              className="text-xxs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-sans font-medium truncate max-w-[150px]"
                              title={ep.description}
                            >
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
                  })()
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-gray-100 pt-4 mt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditCollection(col)}
                className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                title="Edit Collection"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDeleteCollection(col._id)}
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
  );
}
