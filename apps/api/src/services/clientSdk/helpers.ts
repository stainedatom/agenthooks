/**
 * AgentHooks Client SDK — Global API Helper Collection.
 *
 * Defines the client-side JavaScript APIs injected into sandboxed execution iframes.
 * All helpers are registered under the `window.agenthooks` namespace collection and
 * accessed by user scripts via the `agenthooks` (== `window.agenthooks`) handle.
 *
 * ─── HOW TO ADD A NEW HELPER ─────────────────────────────────────────────
 * 1. Declare a standalone `AgentHooksHelperDefinition` const here.
 * 2. Add it to the `helperDefinitions` array at the bottom of this file.
 *    The map key is derived from `helper.name`, so the registry key can never
 *    drift out of sync with the helper's own name.
 * The helper will then automatically be exposed on `window.agenthooks` and
 * callable via `agenthooks.<name>` / `window.agenthooks.<name>`.
 *
 * ─── LAYERING CONVENTION ─────────────────────────────────────────────────
 * Helpers follow a strict layered design:
 *
 *     window.agenthooks.<name>            ← public namespace (exposed to user scripts)
 *       └── feature / composite helpers   ← (e.g. `downloadFile`) refine lower layers
 *             └── transport primitives    ← (e.g. `postMessageToHost`) own the browser API
 *                   └── raw platform API  ← (e.g. `window.parent.postMessage`)
 *
 * RULES for adding/editing helpers:
 * 1. Exactly ONE helper ("transport primitive") touches the raw platform/browser
 *    API (`window.parent.postMessage`). Right now that is `postMessageToHost`.
 * 2. Feature helpers (like `downloadFile`) MUST NOT call raw browser APIs directly.
 *    Instead they compose the primitive via `window.agenthooks.<primitiveName>`,
 *    so the platform coupling stays in a single, easy-to-change spot.
 * 3. A helper must never call "up" the stack or reference itself by name.
 */
import type { AgentHooksHelperCollection, AgentHooksHelperDefinition } from "./types";

/**
 * Transport primitive: the only helper that talks directly to the host window
 * via the raw browser `window.parent.postMessage(...)` API. All feature helpers
 * that send messages to the host should build on this instead of re-implementing
 * the raw call. It cannot call itself through the namespace (that would recurse),
 * so it terminates at the platform API.
 */
const postMessageToHostHelper: AgentHooksHelperDefinition = {
  name: "postMessageToHost",
  description: "Sends a structured postMessage event to the parent host window.",
  code: `function(typeOrObj, payload) {
      try {
        if (typeof typeOrObj === 'object' && typeOrObj !== null) {
          window.parent.postMessage(typeOrObj, '*');
        } else {
          window.parent.postMessage(Object.assign({ type: typeOrObj }, payload || {}), '*');
        }
      } catch (err) {
        console.error("[AgentHooks SDK] Error sending postMessage to host:", err);
      }
    }`,
};

/**
 * Feature / composite helper: builds on the `postMessageToHost` transport
 * primitive (via `window.agenthooks.postMessageToHost`) instead of calling the
 * raw browser API directly. Demonstrates the layered convention above.
 */
const downloadFileHelper: AgentHooksHelperDefinition = {
  name: "downloadFile",
  description: "Triggers a browser file download through the host parent window.",
  code: `function(filenameOrOptions, content, mimeType) {
      try {
        if (typeof filenameOrOptions === 'object' && filenameOrOptions !== null) {
          const fn = filenameOrOptions.filename || 'download.txt';
          const cnt = filenameOrOptions.content || '';
          const mime = filenameOrOptions.mimeType || 'text/plain';
          window.agenthooks.postMessageToHost('download-file', { filename: fn, content: cnt, mimeType: mime });
        } else {
          window.agenthooks.postMessageToHost('download-file', {
            filename: filenameOrOptions || 'download.txt',
            content: content || '',
            mimeType: mimeType || 'text/plain'
          });
        }
      } catch (err) {
        console.error("[AgentHooks SDK] Error triggering file download:", err);
      }
    }`,
};

/**
 * Every helper to register on `window.agenthooks`.
 * Add new helpers to this list to expose them in the sandbox.
 */
const helperDefinitions: AgentHooksHelperDefinition[] = [
  postMessageToHostHelper,
  downloadFileHelper,
];

/**
 * Registry of all client-side API helper functions available in the sandbox.
 * Built from `helperDefinitions` so each entry's key and `name` stay in sync.
 */
export const agenthooksGlobalApiCollection: AgentHooksHelperCollection = Object.fromEntries(
  helperDefinitions.map((helper) => [helper.name, helper])
);