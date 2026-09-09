/**
 * AgentHooks Client SDK — public entry point.
 *
 * Builds the two <script> blocks injected into every sandboxed execution iframe:
 *
 *   1. generateClientSdkScript() — defines `window.agenthooks` and registers all
 *      helper functions from the collection.
 *
 *   2. wrapClientJavascript(code) — wraps user-authored code with data injection
 *      and a `const agenthooks = window.agenthooks` shorthand.
 *
 * ─── CANONICAL USAGE CONVENTION ─────────────────────────────────────────────
 * User scripts should call helpers via the `agenthooks` namespace:
 *
 *   agenthooks.downloadFile('report.csv', csvContent, 'text/csv');
 *   agenthooks.postMessageToHost('my-event', { key: 'value' });
 *
 * No global aliases (e.g. `window.downloadFile`) are exposed — the namespace
 * is the single, unambiguous API surface.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { agenthooksGlobalApiCollection } from "./helpers";

/**
 * Generates the <script> block that defines `window.agenthooks` and registers
 * every helper in the collection onto it.
 *
 * Injected once per rendered HTML document, before any user script runs.
 */
export function generateClientSdkScript(): string {
  const methodAssignments = Object.entries(agenthooksGlobalApiCollection)
    .map(([key, helper]) => `    // ${helper.description}\n    window.agenthooks.${key} = ${helper.code};`)
    .join("\n\n");

  return `
<script>
  (function() {
    // AgentHooks Client SDK — initialise namespace and register all helpers.
    // Access helpers via: agenthooks.<name>(...) or window.agenthooks.<name>(...)
    window.agenthooks = window.agenthooks || {};

${methodAssignments}
  })();
</script>
`;
}

/**
 * Wraps user-authored client JavaScript with:
 *   - Data injection  (`data` / `input` variables from the pipeline response)
 *   - Top-level error boundary
 *   - `const agenthooks = window.agenthooks` shorthand (canonical usage handle)
 *
 * NOTE: The data element ID is intentionally "aghentooks-data" (legacy spelling with
 * transposed letters). It must stay in sync with the `injectClientScripts` writer in
 * pipeline.ts which creates the same element by that exact ID.
 */
export function wrapClientJavascript(javascriptCode: string): string {
  return `
<script>
  (function() {
    try {
      const data = JSON.parse(document.getElementById('aghentooks-data').textContent || '{}');
      const input = data;

      // Canonical handle — use agenthooks.<helper>(...) in your script
      const agenthooks = window.agenthooks;

      ${javascriptCode}
    } catch (err) {
      console.error("[AgentHooks] Error executing client-side script:", err);
    }
  })();
</script>
`;
}

// Re-export the collection and its types as the single public surface for this module.
export { agenthooksGlobalApiCollection } from "./helpers";
export type { AgentHooksHelperDefinition, AgentHooksHelperCollection } from "./types";