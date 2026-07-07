"use client";

import { Endpoint, ExecuteResult } from "../../lib/api";
import MethodBadge from "./MethodBadge";


interface RunModalProps {
  endpoint: Endpoint;
  result: ExecuteResult | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onClose: () => void;
}

export default function RunModal({
  endpoint,
  result,
  loading,
  error,
  onRefresh,
  onClose,
}: RunModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden border border-gray-150">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <MethodBadge method={endpoint.method} className="mr-2" />
            <h2 className="text-lg font-bold inline-block align-middle">{endpoint.description}</h2>
            <p className="text-xs text-gray-400 font-mono mt-1">{endpoint.endpoint}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer text-2xl leading-none transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-h-0 bg-gray-50/30">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-gray-500 mt-4 animate-pulse">
                Fetching API &amp; compiling layout...
              </p>
            </div>
          )}

          {error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 py-16 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl font-bold mb-3">
                !
              </div>
              <p className="text-sm font-semibold text-red-700 mb-1">Execution Failed</p>
              <p className="text-xs text-red-600 max-w-md font-mono whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {!loading && !error && result && (
            <div className="flex flex-col gap-4 w-full h-full min-h-0 flex-1">
              {/* Secure sandboxed iframe — id routes resize-iframe postMessages */}
              <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
                <iframe
                  id="run-modal-iframe"
                  srcDoc={result.html}
                  sandbox="allow-scripts allow-forms"
                  className="w-full flex-1 border-0 block"
                  title="Execution Preview"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
