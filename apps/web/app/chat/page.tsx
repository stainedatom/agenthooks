"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";
import { Send, Loader2, Bot, User, StopCircle, ChevronDown } from "lucide-react";
import { marked } from "marked";
import { listCollections, EndpointCollection } from "../../lib/api";

export default function ChatPage() {
  const [collections, setCollections] = useState<EndpointCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Ref to always have the latest collectionId in the fetch closure
  const selectedCollectionIdRef = useRef(selectedCollectionId);
  selectedCollectionIdRef.current = selectedCollectionId;

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, init) => {
        if (init && init.body && typeof init.body === "string") {
          try {
            const parsed = JSON.parse(init.body);
            if (parsed.messages && Array.isArray(parsed.messages)) {
              parsed.messages = parsed.messages.map((m: any) => {
                if (!m.parts || !Array.isArray(m.parts)) return m;
                return {
                  ...m,
                  parts: m.parts.map((part: any) => {
                    if (part.output && typeof part.output === "object" && "html" in part.output) {
                      const { html, ...restOutput } = part.output;
                      return { ...part, output: restOutput };
                    }
                    return part;
                  }),
                };
              });
              // Attach collectionId to the request body (read from ref to avoid stale closure)
              const currentCollectionId = selectedCollectionIdRef.current;
              if (currentCollectionId) {
                (parsed as any).collectionId = currentCollectionId;
              }
              init = { ...init, body: JSON.stringify(parsed) };
            }
          } catch {
            // If JSON parsing fails, fall back to default request body
          }
        }
        return fetch(url, init);
      },
    }),
  });
  
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch collections on mount
  useEffect(() => {
    async function load() {
      try {
        const cols = await listCollections();
        setCollections(cols);
        const firstCollection = cols[0];
        if (firstCollection) {
          setSelectedCollectionId(firstCollection._id);
        } else {
          setSelectedCollectionId("");
        }
      } catch {
        // Not authenticated or error — collections just won't show
      } finally {
        setCollectionsLoading(false);
      }
    }
    load();
  }, []);


  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for messages from sandboxed iframes (resize, downloads, etc.)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data) return;

      if (event.data.type === "resize-iframe") {
        const iframes = document.querySelectorAll("iframe");
        iframes.forEach((iframe) => {
          if (iframe.contentWindow === event.source) {
            const maxHeight = 600;
            const targetHeight = Math.min(event.data.height, maxHeight);
            iframe.style.height = `${targetHeight}px`;
          }
        });
      } else if (event.data.type === "download-file") {
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

  const isLoading = status === "streaming" || status === "submitted";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  /** Extracts text from a message's parts array */
  function getMessageText(msg: any): string {
    if (msg.parts && Array.isArray(msg.parts)) {
      const textParts = msg.parts.filter((p: any) => p.type === "text");
      if (textParts.length > 0) {
        return textParts.map((p: any) => p.text).join("");
      }
    }
    return msg.content || "";
  }

  return (
    <div className="flex flex-col h-dvh bg-white font-sans">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white shrink-0 shadow-sm z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
          <Bot size={22} />
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">AgentHooks</h1>
          {/* Collection dropdown */}
          {!collectionsLoading && collections.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors border border-gray-200/50"
              >
                {selectedCollectionId
                  ? collections.find(c => c._id === selectedCollectionId)?.name || "Collection"
                  : "Select collection"}
                <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5 max-h-60 overflow-y-auto">
                    {collections.map((col) => (
                      <button
                        key={col._id}
                        onClick={() => { setSelectedCollectionId(col._id); setDropdownOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                          selectedCollectionId === col._id
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="truncate block">{col.name}</span>
                        {col.description && (
                          <span className="text-xxs text-gray-400 truncate block mt-0.5">{col.description}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {isLoading && (
          <button
            onClick={stop}
            className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <StopCircle size={16} />
            Stop
          </button>
        )}
      </header>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/20">
                <Bot size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                Welcome to AgentHooks
              </h2>
            <p className="text-sm text-gray-400 max-w-sm">
              Ask questions, execute API endpoints, and use interactive widgets.
            </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const textContent = getMessageText(msg);

            const templateWidgetPart = msg.parts?.find(
              (p: any) =>
                (p.type === "dynamic-tool" || p.type.startsWith("tool-")) &&
                p.state === "output-available" &&
                p.output?.success &&
                p.output?.hasTemplate
            ) as any;
            const hasTemplateWidget = !!templateWidgetPart;

            return (
              <div
                key={i}
                className={`flex items-start gap-4 ${
                  msg.role === "user" ? "flex-row-reverse" : "w-full"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                    msg.role === "user"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-200 text-blue-600"
                  }`}
                >
                  {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                </div>

                {hasTemplateWidget ? (
                  <div className="flex-1 w-full my-1 animate-in fade-in duration-150 max-w-[90%]">
                     <div className="w-full max-w-[500px] mr-auto"> {/* Restrict and left-align the iframe container */}
                    <iframe
                      srcDoc={templateWidgetPart.output.html}
                      sandbox="allow-scripts allow-forms"
                      className="w-full border-0 block"
                      style={{ height: "auto" }}
                      title={`Widget: ${templateWidgetPart.toolName}`}
                    />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-5 py-3.5 text-base leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm shadow-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.parts && msg.parts.length > 0 ? (
                      <div className="space-y-3">
                        {msg.parts.map((part: any, partIdx: number) => {
                          if (part.type === "text") {
                            // Text is automatically suppressed at the message level when
                            // a template widget is rendered (see hasTemplateWidget check above)
                            const parsedHtml = marked.parse(part.text) as string;
                            return (
                              <div
                                key={partIdx}
                                className="markdown-content"
                                dangerouslySetInnerHTML={{ __html: parsedHtml }}
                              />
                            );
                          }

                          const isToolPart = part.type === "dynamic-tool" || part.type.startsWith("tool-");
                          if (isToolPart) {
                            const toolCallId = part.toolCallId;
                            const toolName = part.toolName || part.type.replace("tool-", "");
                            const state = part.state;

                            if (state === "output-available") {
                              const { output } = part;
                              if (output && output.success && output.html && output.hasTemplate) {
                                return null;
                              } else if (output && !output.success) {
                                return (
                                  <div
                                    key={toolCallId}
                                    className="text-xs text-red-605 font-mono bg-red-50 border border-red-200 rounded-lg p-3 my-2"
                                  >
                                    Error running {toolName.replace("endpoint_", "")}: {output.error || "Unknown execution error"}
                                  </div>
                                );
                              }
                            } else if (state === "output-error") {
                              return (
                                <div
                                  key={toolCallId}
                                  className="text-xs text-red-605 font-mono bg-red-50 border border-red-200 rounded-lg p-3 my-2"
                                >
                                  Error running {toolName.replace("endpoint_", "")}: {part.errorText || "Unknown error"}
                                </div>
                              );
                            } else {
                              return (
                                <div
                                  key={toolCallId}
                                  className="text-xs text-gray-400 italic flex items-center gap-1.5 my-2"
                                >
                                  <Loader2 className="animate-spin h-3.5 w-3.5 text-blue-500" />
                                  Running widget {toolName.replace("endpoint_", "")}...
                                </div>
                              );
                            }
                          }
                          return null;
                        })}
                      </div>
                    ) : (
                      textContent || (
                        <span className="text-gray-400 italic flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
                          Thinking...
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading &&
            messages.length > 0 &&
            !getMessageText(messages[messages.length - 1]) && (
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={18} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-blue-500/80 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-blue-500/80 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-blue-500/80 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 shrink-0 shadow-sm z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-3xl mx-auto w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 rounded-2xl border border-gray-300 bg-gray-50/50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-100 disabled:text-gray-450 text-white rounded-2xl p-3.5 transition-all disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none shrink-0"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>

    </div>
  );
}