import { useState, useCallback } from "react";
import { executeEndpoint, Endpoint, ExecuteResult } from "../../../lib/api";

export function useExecutionModal() {
  const [execEndpoint, setExecEndpoint] = useState<Endpoint | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState("");

  const execute = useCallback(async (ep: Endpoint) => {
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
  }, []);

  const refresh = useCallback(() => {
    if (execEndpoint) {
      execute(execEndpoint);
    }
  }, [execEndpoint, execute]);

  const close = useCallback(() => {
    setExecEndpoint(null);
    setExecResult(null);
    setExecError("");
    setExecLoading(false);
  }, []);

  return {
    execEndpoint,
    execResult,
    execLoading,
    execError,
    execute,
    refresh,
    close,
  };
}
