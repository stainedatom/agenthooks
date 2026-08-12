"use client";

import { useState, useEffect } from "react";
import {
  createCollection,
  updateCollection,
  addEndpointsToCollection,
  EndpointCollection,
} from "../../lib/api";
import RunModal from "../components/RunModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import { useDashboardData } from "./hooks/useDashboardData";
import { useBulkSelection } from "./hooks/useBulkSelection";
import { useEndpointStudio } from "./hooks/useEndpointStudio";
import { useExecutionModal } from "./hooks/useExecutionModal";
import { useDeleteModal } from "./hooks/useDeleteModal";
import { DashboardHeader } from "./components/DashboardHeader";
import { EndpointList } from "./components/EndpointList";
import { CollectionGrid } from "./components/CollectionGrid";
import { CollectionModal } from "./components/CollectionModal";
import { AddToCollectionModal } from "./components/AddToCollectionModal";
import { EndpointStudioOverlay } from "./components/EndpointStudioOverlay";

export default function DashboardPage() {
  const {
    user,
    loading,
    endpoints,
    setEndpoints,
    collections,
    setCollections,
    error,
    setError,
    handleLogout,
  } = useDashboardData();

  const {
    bulkSelectedIds,
    toggleBulkSelection,
    toggleSelectAll,
    clearBulkSelection,
  } = useBulkSelection(endpoints);

  const studio = useEndpointStudio();
  const execModal = useExecutionModal();
  const deleteModal = useDeleteModal();

  const [activeTab, setActiveTab] = useState<"endpoints" | "collections">("endpoints");

  // Collection modal state
  const [collectionModalState, setCollectionModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    collection?: EndpointCollection | null;
  }>({ isOpen: false, mode: "create" });

  // Add-to-collection modal state
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);

  // Listen for download-file messages from sandboxed preview or execution iframes
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === "download-file") {
        const { filename, content, mimeType } = event.data;
        const blob = new Blob([content], { type: mimeType || "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "download.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
      <DashboardHeader
        user={user}
        activeTab={activeTab}
        onNewEndpoint={() => {
          setError("");
          clearBulkSelection();
          studio.openCreate();
        }}
        onNewCollection={() => {
          setError("");
          setCollectionModalState({ isOpen: true, mode: "create" });
        }}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-150 border border-red-200 text-red-750 p-3 rounded-lg mb-4 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        <div className="flex border-b border-gray-200 mb-6 gap-6">
          <button
            onClick={() => {
              setActiveTab("endpoints");
              setError("");
              clearBulkSelection();
            }}
            className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === "endpoints"
                ? "border-black text-black"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Endpoints ({endpoints.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("collections");
              setError("");
              clearBulkSelection();
            }}
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
          <EndpointList
            endpoints={endpoints}
            bulkSelectedIds={bulkSelectedIds}
            onToggleBulkSelection={toggleBulkSelection}
            onToggleSelectAll={toggleSelectAll}
            onClearBulkSelection={clearBulkSelection}
            onOpenAddToCollection={() => setShowAddToCollectionModal(true)}
            onOpenBulkDelete={deleteModal.openBulkDelete}
            onExecute={execModal.execute}
            onEdit={studio.openEdit}
            onDelete={(id) => deleteModal.openSingleDelete(id, "endpoint")}
            onCreateClick={() => {
              setError("");
              studio.openCreate();
            }}
          />
        ) : (
          <CollectionGrid
            collections={collections}
            endpoints={endpoints}
            onEditCollection={(col) =>
              setCollectionModalState({ isOpen: true, mode: "edit", collection: col })
            }
            onDeleteCollection={(id) => deleteModal.openSingleDelete(id, "collection")}
            onCreateClick={() =>
              setCollectionModalState({ isOpen: true, mode: "create" })
            }
          />
        )}
      </main>

      {/* Studio Overlay */}
      <EndpointStudioOverlay
        studio={studio}
        onCreateSuccess={(ep) => setEndpoints([ep, ...endpoints])}
        onUpdateSuccess={(updated) =>
          setEndpoints(endpoints.map((e) => (e._id === updated._id ? updated : e)))
        }
      />

      {/* Execution Runner Modal */}
      {execModal.execEndpoint && (
        <RunModal
          endpoint={execModal.execEndpoint}
          result={execModal.execResult}
          loading={execModal.execLoading}
          error={execModal.execError}
          onRefresh={execModal.refresh}
          onClose={execModal.close}
        />
      )}

      {/* Collection Modal */}
      <CollectionModal
        isOpen={collectionModalState.isOpen}
        mode={collectionModalState.mode}
        initialCollection={collectionModalState.collection}
        endpoints={endpoints}
        onSave={async (payload) => {
          try {
            if (collectionModalState.mode === "create") {
              const col = await createCollection(payload);
              setCollections([col, ...collections]);
            } else if (collectionModalState.collection) {
              const col = await updateCollection(collectionModalState.collection._id, payload);
              setCollections(collections.map((c) => (c._id === col._id ? col : c)));
            }
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save collection");
          }
        }}
        onClose={() => setCollectionModalState({ isOpen: false, mode: "create" })}
      />

      {/* Single Item Deletion Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteModal.deleteTarget}
        title={
          deleteModal.deleteTarget?.type === "endpoint"
            ? "Delete Endpoint"
            : "Delete Collection"
        }
        message={
          deleteModal.deleteTarget?.type === "endpoint"
            ? "Are you sure you want to delete this endpoint? This will also remove it from any collections."
            : "Are you sure you want to delete this collection? The endpoints inside it will not be deleted."
        }
        onConfirm={() =>
          deleteModal.executeSingleDelete(
            (id, type) => {
              if (type === "endpoint") {
                setEndpoints(endpoints.filter((ep) => ep._id !== id));
                setCollections(
                  collections.map((col) => ({
                    ...col,
                    endpointIds: col.endpointIds ? col.endpointIds.filter((eId: string) => eId !== id) : [],
                  }))
                );
              } else {
                setCollections(collections.filter((c) => c._id !== id));
              }
            },
            (errMsg) => setError(errMsg)
          )
        }
        onCancel={deleteModal.closeSingleDelete}
        loading={deleteModal.singleLoading}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isBulkDeleteOpen}
        title={`Delete ${bulkSelectedIds.length} Endpoints`}
        message={`Are you sure you want to delete ${bulkSelectedIds.length} selected endpoints? They will also be removed from any collections.`}
        onConfirm={() =>
          deleteModal.executeBulkDelete(
            bulkSelectedIds,
            () => {
              setEndpoints(endpoints.filter((ep) => !bulkSelectedIds.includes(ep._id)));
              setCollections(
                collections.map((col) => ({
                  ...col,
                  endpointIds: col.endpointIds
                    ? col.endpointIds.filter((id: string) => !bulkSelectedIds.includes(id))
                    : [],
                }))
              );
              clearBulkSelection();
            },
            (errMsg) => setError(errMsg)
          )
        }
        onCancel={deleteModal.closeBulkDelete}
        loading={deleteModal.bulkLoading}
      />

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        isOpen={showAddToCollectionModal}
        bulkSelectedCount={bulkSelectedIds.length}
        collections={collections}
        onBatchAddToCollection={async (collectionId) => {
          try {
            const updated = await addEndpointsToCollection(collectionId, bulkSelectedIds);
            setCollections(collections.map((col) => (col._id === updated._id ? updated : col)));
            clearBulkSelection();
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add endpoints to collection");
          }
        }}
        onBatchCreateCollection={async (payload) => {
          try {
            const col = await createCollection({
              ...payload,
              endpointIds: bulkSelectedIds,
            });
            setCollections([col, ...collections]);
            clearBulkSelection();
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create collection");
          }
        }}
        onGoToCollectionsTab={() => {
          setActiveTab("collections");
          setShowAddToCollectionModal(false);
        }}
        onClose={() => setShowAddToCollectionModal(false)}
      />
    </div>
  );
}
