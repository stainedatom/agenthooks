"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";

export default function ChatPage() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    return "";
  }

  return (
    <div className="flex flex-col h-dvh bg-white">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
          AI
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">AI Assistant</h1>
        </div>
        {isLoading && (
          <button
            onClick={stop}
            className="ml-auto text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded-lg"
          >
            Stop
          </button>
        )}
      </header>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl mb-4 shadow-md">
              💬
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Start a conversation
            </h2>
            <p className="text-sm text-gray-400 max-w-sm">
              Send a message below and the AI will respond in real-time.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const textContent = getMessageText(msg);

          return (
            <div
              key={i}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm ${
                  msg.role === "user"
                    ? "bg-gray-700 text-white"
                    : "bg-white text-blue-600 border border-gray-200"
                }`}
              >
                {msg.role === "user" ? "U" : "AI"}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm"
                }`}
              >
                {textContent || (
                  <span className="text-gray-400 italic">Thinking...</span>
                )}
              </div>
            </div>
          );
        })}

        {isLoading &&
          messages.length > 0 &&
          !getMessageText(messages[messages.length - 1]) && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-blue-600 border border-gray-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                AI
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}