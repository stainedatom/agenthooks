/**
 * AgentHooks Client SDK — public entry point.
 *
 * Re-exports the global API helper collection and builds the `<script>` blocks
 * injected into sandboxed execution iframes. The directory is imported from
 * `services/clientSdk` (resolved to this `index.ts`), keeping all existing
 * imports in `pipeline.ts` unchanged.
 */
import { agenthooksGlobalApiCollection } from "./helpers";

/**
 * Generates the <script> block defining `window.agenthooks` and all registered helpers.
 */
export function generateClientSdkScript(): string {
  const methodAssignments = Object.entries(agenthooksGlobalApiCollection)
    .map(([key, helper]) => `    // ${helper.description}\n    window.agenthooks.${key} = ${helper.code};`)
    .join("\n\n");

  return `
<script>
  (function() {
    // AgentHooks Client SDK namespace collection
    window.agenthooks = window.agenthooks || {};

${methodAssignments}
  })();
</script>
`;
}

/**
 * Wraps custom client JavaScript with runtime error handling, response data injection,
 * and scoped access to the `agenthooks` collection and helper functions.
 */
export function wrapClientJavascript(javascriptCode: string): string {
  return `
<script>
  (function() {
    try {
      const data = JSON.parse(document.getElementById('aghentooks-data').textContent || '{}');
      const input = data;

      // Convenience handle for the AgentHooks SDK namespace (window.agenthooks)
      const agenthooks = window.agenthooks;

      ${javascriptCode}
    } catch (err) {
      console.error("Error executing client-side script:", err);
    }
  })();
</script>
`;
}

// Re-export the collection and its types so `./clientSdk` remains the single,
// backwards-compatible public surface for the Client SDK module.
export { agenthooksGlobalApiCollection } from "./helpers";
export type { AgentHooksHelperDefinition, AgentHooksHelperCollection } from "./types";