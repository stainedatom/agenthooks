"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";
import { Send, Loader2, Bot, User, StopCircle } from "lucide-react";
import { marked } from "marked";

export default function ChatPage() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // States for fullscreen widget display
  const [fullscreenHtml, setFullscreenHtml] = useState<string | null>(null);
  const [fullscreenTitle, setFullscreenTitle] = useState<string>("");

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for resize messages from sandboxed iframes
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === "resize-iframe") {
        const iframe = document.getElementById(event.data.id) as HTMLIFrameElement;
        if (iframe) {
          const height = Math.min(event.data.height, 600); // limit card height in feed
          iframe.style.height = `${height}px`;
        }
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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
          <Bot size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">AI Assistant</h1>
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/20">
                <Bot size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                How can I help you today?
              </h2>
            <p className="text-sm text-gray-400 max-w-sm">
              Send a message below and the AI will respond in real-time.
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
                  <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden text-gray-850 my-1 animate-in fade-in zoom-in-95 duration-150 max-w-[90%]">
                    {/* Header */}
                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-semibold text-sm text-gray-800">
                          Widget Preview
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setFullscreenHtml(templateWidgetPart.output.html);
                          setFullscreenTitle("Widget Preview");
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        Fullscreen
                      </button>
                    </div>
                    {/* Frame */}
                    <iframe
                      id={`iframe-${templateWidgetPart.toolCallId}`}
                      srcDoc={templateWidgetPart.output.html}
                      sandbox="allow-scripts allow-forms"
                      className="w-full border-0 block shadow-inner"
                      style={{ minHeight: "400px", height: "600px" }}
                      title={`Widget: ${templateWidgetPart.toolName}`}
                    />
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
                            // Check if there is any other part in this message that is a tool output with a template
                            const hasTemplateWidget = msg.parts.some(
                              (p: any) =>
                                (p.type === "dynamic-tool" || p.type.startsWith("tool-")) &&
                                p.state === "output-available" &&
                                p.output?.success &&
                                p.output?.hasTemplate
                            );
                            if (hasTemplateWidget) {
                              return null;
                            }
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
      {/* Fullscreen Widget Modal */}
      {fullscreenHtml && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900">{fullscreenTitle}</h2>
              <button
                onClick={() => setFullscreenHtml(null)}
                className="text-gray-400 hover:text-gray-650 cursor-pointer text-2xl leading-none transition-colors px-2 py-1"
              >
                &times;
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 min-h-0 bg-white">
              <iframe
                srcDoc={fullscreenHtml}
                sandbox="allow-scripts allow-forms"
                className="w-full h-full border-0 block"
                title="Fullscreen Widget Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}