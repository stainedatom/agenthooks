import { useState, useCallback } from "react";
import { Endpoint } from "../../../lib/api";

export function useBulkSelection(endpoints: Endpoint[]) {
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);

  const toggleBulkSelection = useCallback((endpointId: string) => {
    setBulkSelectedIds((prev) =>
      prev.includes(endpointId)
        ? prev.filter((id) => id !== endpointId)
        : [...prev, endpointId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setBulkSelectedIds((prev) =>
      prev.length === endpoints.length ? [] : endpoints.map((ep) => ep._id)
    );
  }, [endpoints]);

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedIds([]);
  }, []);

  return {
    bulkSelectedIds,
    setBulkSelectedIds,
    toggleBulkSelection,
    toggleSelectAll,
    clearBulkSelection,
  };
}
