/**
 * AgentHooks Client SDK & Global API Collection
 *
 * Defines the client-side JavaScript APIs injected into sandboxed execution iframes.
 * All helpers are registered under the `window.agenthooks` namespace collection,
 * with local scope variables provided to user scripts for convenience.
 */

export interface AgentHooksHelperDefinition {
  name: string;
  description: string;
  code: string;
}

/**
 * Registry of all client-side API helper functions available in the sandbox.
 * To add a new helper function to `window.agenthooks`, simply register it here.
 */
export const agenthooksGlobalApiCollection: Record<string, AgentHooksHelperDefinition> = {
  postMessageToHost: {
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
  },
  downloadFile: {
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
  },
};

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

    // Convenience aliases
    window.agenthooks.postMessage = window.agenthooks.postMessageToHost;

    // Backwards-compatibility global aliases
    window.postMessageToHost = window.agenthooks.postMessageToHost;
    window.postMessageHost = window.agenthooks.postMessageToHost;
    window.downloadFile = window.agenthooks.downloadFile;
  })();
</script>
`;
}

/**
 * Wraps custom client JavaScript with runtime error handling, response data injection,
 * and scoped access to the `agenthooks` collection and helper functions.
 */
export function wrapClientJavascript(javascriptCode: string): string {
  const localShortcuts = Object.keys(agenthooksGlobalApiCollection)
    .map((name) => `      const ${name} = window.agenthooks.${name};`)
    .join("\n");

  return `
<script>
  (function() {
    try {
      const data = JSON.parse(document.getElementById('aghentooks-data').textContent || '{}');
      const input = data;

      // Local shortcuts for AgentHooks SDK helpers
      const agenthooks = window.agenthooks;
${localShortcuts}
      const postMessageHost = window.agenthooks.postMessageToHost;

      ${javascriptCode}
    } catch (err) {
      console.error("Error executing client-side script:", err);
    }
  })();
</script>
`;
}
