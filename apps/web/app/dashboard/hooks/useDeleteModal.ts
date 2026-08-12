import { useState, useCallback } from "react";
import { deleteEndpoint, deleteCollection, deleteEndpoints } from "../../../lib/api";

export interface DeleteItemTarget {
  id: string;
  type: "endpoint" | "collection";
}

export function useDeleteModal() {
  const [deleteTarget, setDeleteTarget] = useState<DeleteItemTarget | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const openSingleDelete = useCallback((id: string, type: "endpoint" | "collection") => {
    setDeleteTarget({ id, type });
  }, []);

  const closeSingleDelete = useCallback(() => {
    setDeleteTarget(null);
    setSingleLoading(false);
  }, []);

  const openBulkDelete = useCallback(() => {
    setIsBulkDeleteOpen(true);
  }, []);

  const closeBulkDelete = useCallback(() => {
    setIsBulkDeleteOpen(false);
    setBulkLoading(false);
  }, []);

  const executeSingleDelete = useCallback(
    async (onSuccess: (id: string, type: "endpoint" | "collection") => void, onError: (err: string) => void) => {
      if (!deleteTarget) return;
      setSingleLoading(true);
      try {
        if (deleteTarget.type === "endpoint") {
          await deleteEndpoint(deleteTarget.id);
        } else {
          await deleteCollection(deleteTarget.id);
        }
        onSuccess(deleteTarget.id, deleteTarget.type);
        closeSingleDelete();
      } catch (err) {
        onError(err instanceof Error ? err.message : `Failed to delete ${deleteTarget.type}`);
      } finally {
        setSingleLoading(false);
      }
    },
    [deleteTarget, closeSingleDelete]
  );

  const executeBulkDelete = useCallback(
    async (bulkIds: string[], onSuccess: () => void, onError: (err: string) => void) => {
      if (bulkIds.length === 0) return;
      setBulkLoading(true);
      try {
        await deleteEndpoints(bulkIds);
        onSuccess();
        closeBulkDelete();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to delete selected endpoints");
      } finally {
        setBulkLoading(false);
      }
    },
    [closeBulkDelete]
  );

  return {
    deleteTarget,
    singleLoading,
    openSingleDelete,
    closeSingleDelete,
    executeSingleDelete,
    isBulkDeleteOpen,
    bulkLoading,
    openBulkDelete,
    closeBulkDelete,
    executeBulkDelete,
  };
}
