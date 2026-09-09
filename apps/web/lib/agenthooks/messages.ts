/**
 * AgentHooks — Host-side message dispatcher.
 *
 * Single source of truth for reacting to `postMessage` events sent by sandboxed
 * AgentHooks iframes (studio preview, execution modal, chat). Components no
 * longer hardcode `resize-iframe` / `download-file` branches — they install this
 * shared dispatcher via `useAgentHooksMessageListener()`.
 *
 * ─── HOW TO ADD A NEW HOST-FACING MESSAGE ─────────────────────────────────
 * Add ONE entry to the `messageHandlers` registry below, keyed by the message
 * `type`. That's it — no other file changes. Even before you add a handler,
 * the default catch-all logs every unrecognized message, so nothing is ever
 * silently dropped by the host.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** Shape of every postMessage event sent from a sandboxed AgentHooks iframe. */
export interface AgentHooksMessage {
  type: string;
  [key: string]: unknown;
}

/** Handler for a single message `type`. Receives the payload + raw event. */
type MessageHandler = (message: AgentHooksMessage, event: MessageEvent) => void;

/**
 * `download-file`: triggers a browser download from the reported content.
 * Moved verbatim from the previous dashboard-page listener.
 */
function handleDownloadFile(message: AgentHooksMessage): void {
  const filename = String(message.filename || "download.txt");
  const content = String(message.content ?? "");
  const mimeType = String(message.mimeType || "text/plain");

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * `resize-iframe`: sizes the originating iframe to the reported height.
 *
 * The iframe is located by matching `event.source` against each iframe's
 * `contentWindow`, NOT by a hardcoded element id. This lets a single handler
 * serve the studio preview, the execution modal, and chat — no per-component
 * duplicated logic.
 */
function handleResizeIframe(message: AgentHooksMessage, event: MessageEvent): void {
  // Ignore malformed / non-positive heights instead of collapsing the iframe to 0px.
  if (typeof message.height !== "number" || message.height <= 0) return;
  const iframes = Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe"));
  const source = iframes.find((iframe) => iframe.contentWindow === event.source);
  if (source) {
    source.style.height = `${message.height}px`;
  }
}

/** Registry of message handlers, keyed by message `type`. */
const messageHandlers: Record<string, MessageHandler> = {
  "download-file": handleDownloadFile,
  "resize-iframe": handleResizeIframe,
};

/**
 * Dispatches a single raw `MessageEvent` to the matching handler, or logs it
 * via the catch-all when no handler is registered yet.
 */
function dispatch(event: MessageEvent): void {
  const data = event.data as AgentHooksMessage | undefined;
  if (!data || typeof data.type !== "string") return;

  const handler = messageHandlers[data.type];
  if (handler) {
    handler(data, event);
  } else {
    // Catch-all: surface unknown messages so new helpers are visible without
    // adding a handler first (avoids the previous silent-drop behavior).
    console.log("[AgentHooks] Host received:", data);
  }
}

let subscriberCount = 0;

/**
 * Installs a single, shared `window` message listener.
 *
 * Safe to call from multiple mounted components: the listener attaches on the
 * FIRST install and is removed only when the LAST subscriber uninstalls
 * (ref-counted), so an unmounting component can never tear it down while
 * others still rely on it.
 */
export function installAgentHooksMessageListener(): () => void {
  subscriberCount++;
  if (subscriberCount === 1) {
    window.addEventListener("message", dispatch);
  }
  return () => {
    subscriberCount--;
    if (subscriberCount <= 0) {
      subscriberCount = 0;
      window.removeEventListener("message", dispatch);
    }
  };
}

export { messageHandlers };