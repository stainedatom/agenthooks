"use client";

import { useState } from "react";
import { Sparkles, Code, Terminal } from "lucide-react";
import CodeEditor from "./CodeEditor";

export interface EndpointFormValues {
  description: string;
  method: string;
  endpoint: string;
  parameters: string;
  enableJsonata: boolean;
  jsonataCode: string;
  jsonataPrompt?: string;
  enableJsonlogic: boolean;
  jsonlogicCode: string;
  jsonlogicPrompt?: string;
  enableTemplate: boolean;
  template: string;
  templatePrompt?: string;
  enableJavascript: boolean;
  javascriptCode: string;
}

export const defaultFormValues: EndpointFormValues = {
  description: "",
  method: "GET",
  endpoint: "",
  parameters: "",
  enableJsonata: false,
  jsonataCode: "",
  jsonataPrompt: "",
  enableJsonlogic: false,
  jsonlogicCode: "",
  jsonlogicPrompt: "",
  enableTemplate: false,
  template: "",
  templatePrompt: "",
  enableJavascript: false,
  javascriptCode: "",
};

interface EndpointFormProps {
  /** Native form id — used by the parent to imperatively submit via requestSubmit() */
  id: string;
  values: EndpointFormValues;
  onChange: (values: EndpointFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  onClearError: () => void;
  onGenerateAiTemplate?: () => void;
  generatingAiTemplate?: boolean;
  onGenerateAiJsonata?: () => void;
  generatingAiJsonata?: boolean;
  onGenerateAiJsonlogic?: () => void;
  generatingAiJsonlogic?: boolean;
  onGenerateFullAiPipeline?: () => void;
  generatingFullPipeline?: boolean;
}

const METHOD_ACTIVE_STYLES: Record<string, string> = {
  GET: "bg-green-50 text-green-700 border-green-200 shadow-sm font-semibold",
  POST: "bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-semibold",
  PUT: "bg-orange-50 text-orange-700 border-orange-200 shadow-sm font-semibold",
  PATCH: "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm font-semibold",
  DELETE: "bg-red-50 text-red-700 border-red-200 shadow-sm font-semibold",
  NONE: "bg-gray-100 text-gray-700 border-gray-300 shadow-sm font-semibold",
};

export default function EndpointForm({
  id,
  values,
  onChange,
  onSubmit,
  error,
  onClearError,
  onGenerateAiTemplate,
  generatingAiTemplate,
  onGenerateAiJsonata,
  generatingAiJsonata,
  onGenerateAiJsonlogic,
  generatingAiJsonlogic,
  onGenerateFullAiPipeline,
  generatingFullPipeline,
}: EndpointFormProps) {
  const [activeTab, setActiveTab] = useState<"jsonata" | "logic_ui" | "javascript">("jsonata");

  /** Partial-update helper — keeps all other fields intact */
  function update<K extends keyof EndpointFormValues>(
    key: K,
    value: EndpointFormValues[K]
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form onSubmit={onSubmit} id={id} className="flex flex-col gap-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
          <span className="text-sm">⚠️</span>
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onClearError}
            className="text-red-400 hover:text-red-600 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Section 1: Data Source ─────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">
            1. Data Source / Endpoint
          </span>
        </div>

        {/* Endpoint Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition-all"
            placeholder="e.g. Weather Service for San Francisco"
          />
        </div>

        {/* HTTP Method Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">HTTP Method</label>
          <div className="grid grid-cols-6 gap-2">
            {["GET", "POST", "PUT", "PATCH", "DELETE", "NONE"].map((m) => {
              const active = values.method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => update("method", m)}
                  className={`py-2 text-xs font-mono rounded-lg border transition-all cursor-pointer text-center ${
                    active
                      ? METHOD_ACTIVE_STYLES[m]
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <p className="text-xxs text-gray-400 mt-0.5">
            Select &apos;NONE&apos; if this endpoint operates strictly on mock data without making an external fetch.
          </p>
        </div>

        {/* External Endpoint URL */}
        {values.method !== "NONE" && (
          <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <label className="text-sm font-medium text-gray-700">
              External Endpoint URL
            </label>
            <input
              type="url"
              value={values.endpoint}
              onChange={(e) => update("endpoint", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition-all font-mono bg-gray-50/50 focus:bg-white"
              placeholder="https://api.example.com/data"
            />
          </div>
        )}

        {/* Parameters / Mock Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            {values.method === "NONE" ? "Mock Input Data" : "Parameters"}{" "}
            <span className="text-gray-400 font-normal text-xs">(Optional JSON)</span>
          </label>
          <CodeEditor
            value={values.parameters}
            onChange={(val) => update("parameters", val)}
            language="json"
            height="120px"
          />
          <p className="text-xxs text-gray-400 mt-1">
            {values.method === "NONE"
              ? "Provide the JSON payload that your script will execute on (accessible as the 'input' object)."
              : "Provide query or request body parameters in JSON format. These will be automatically sent with the external API call."}
          </p>
        </div>

        {/* Master AI Full Pipeline Banner */}
        {onGenerateFullAiPipeline && (
          <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
            <div>
              <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-600 animate-pulse" />
                <span>Auto-Generate Full Pipeline with AI</span>
              </h4>
              <p className="text-xxs text-purple-700 mt-0.5">
                Synchronizes JSONata, JSON Logic rules, and UI templates in 1 click.
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerateFullAiPipeline}
              disabled={generatingFullPipeline}
              className="shrink-0 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              title="Generate a fully synchronized JSONata, JSON Logic, UI Template, and script pipeline"
            >
              {generatingFullPipeline ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Generate Full Pipeline</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <hr className="border-gray-150" />

      {/* ─── Pipeline Tabs Navigation ────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">
            2. Pipeline Configuration Tabs
          </span>
          <span className="text-xxs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
            {activeTab === "jsonata" && "Data Transformation Stage"}
            {activeTab === "logic_ui" && "Rules & UI Render Stage"}
            {activeTab === "javascript" && "Client-Side Script Stage"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-gray-100/90 rounded-xl border border-gray-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("jsonata")}
            className={`py-2 px-3 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              activeTab === "jsonata"
                ? "bg-white text-purple-950 shadow-xs border border-purple-200/60 font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60 font-medium"
            }`}
          >
            <Sparkles size={14} className={activeTab === "jsonata" ? "text-purple-600" : "text-gray-400"} />
            <span>JSONata</span>
            {values.enableJsonata && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs animate-pulse" title="JSONata Enabled" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logic_ui")}
            className={`py-2 px-3 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              activeTab === "logic_ui"
                ? "bg-white text-indigo-950 shadow-xs border border-indigo-200/60 font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60 font-medium"
            }`}
          >
            <Code size={14} className={activeTab === "logic_ui" ? "text-indigo-600" : "text-gray-400"} />
            <span>JSON Logic &amp; UI Template</span>
            {(values.enableJsonlogic || values.enableTemplate) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs animate-pulse" title="Rules or Template Enabled" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("javascript")}
            className={`py-2 px-3 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              activeTab === "javascript"
                ? "bg-white text-emerald-950 shadow-xs border border-emerald-200/60 font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60 font-medium"
            }`}
          >
            <Terminal size={14} className={activeTab === "javascript" ? "text-emerald-600" : "text-gray-400"} />
            <span>Client JS</span>
            {values.enableJavascript && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs animate-pulse" title="Client JS Enabled" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Tab 1: JSONata Transformation ────────────────── */}
      {activeTab === "jsonata" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <CollapsibleCodeSection
            title="JSONata Transformation"
            enabled={values.enableJsonata}
            onEnableChange={(val) => update("enableJsonata", val)}
            value={values.jsonataCode}
            onValueChange={(val) => update("jsonataCode", val)}
            placeholder={`/* JSONata query to transform input JSON */\n{\n  "title": title,\n  "items": [items]\n}`}
            checkboxLabel="Enable JSONata"
            language="json"
            height="180px"
            onAiGenerate={onGenerateAiJsonata}
            aiLoading={generatingAiJsonata}
            promptValue={values.jsonataPrompt}
            onPromptChange={(val) => update("jsonataPrompt", val)}
            promptPlaceholder="Custom JSONata AI Directive (e.g. Filter products with price < 20 and pick title & price)..."
          />
        </div>
      )}

      {/* ─── Tab 2: JSON Logic & UI Template ──────────────── */}
      {activeTab === "logic_ui" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Section: JSON Logic Evaluation */}
          <CollapsibleCodeSection
            title="JSON Logic Evaluation"
            enabled={values.enableJsonlogic}
            onEnableChange={(val) => update("enableJsonlogic", val)}
            value={values.jsonlogicCode}
            onValueChange={(val) => update("jsonlogicCode", val)}
            placeholder={`/* JSON Logic rule validation or transformation */\n{\n  "if": [\n    { ">": [{ "var": "temp" }, 25] },\n    "Warm",\n    "Cool"\n  ]\n}`}
            checkboxLabel="Enable JSON Logic"
            language="json"
            height="120px"
            onAiGenerate={onGenerateAiJsonlogic}
            aiLoading={generatingAiJsonlogic}
            promptValue={values.jsonlogicPrompt}
            onPromptChange={(val) => update("jsonlogicPrompt", val)}
            promptPlaceholder="Custom JSON Logic AI Directive (e.g. Check if price is greater than 50)..."
          />

          <hr className="border-gray-150" />

          {/* Section: UI Template */}
          <CollapsibleCodeSection
            title="UI Template"
            enabled={values.enableTemplate}
            onEnableChange={(val) => update("enableTemplate", val)}
            value={values.template}
            onValueChange={(val) => update("template", val)}
            placeholder={`<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left">\n  <h2 class="text-xl font-bold text-gray-900">{{title}}</h2>\n  <p class="text-gray-600 mt-2">{{summary}}</p>\n</div>`}
            checkboxLabel="Enable Template"
            language="html"
            height="200px"
            onAiGenerate={onGenerateAiTemplate}
            aiLoading={generatingAiTemplate}
            promptValue={values.templatePrompt}
            onPromptChange={(val) => update("templatePrompt", val)}
            promptPlaceholder="Custom UI Template AI Directive (e.g. Render 2-column dark-mode cards with price badges)..."
          />
        </div>
      )}

      {/* ─── Tab 3: JavaScript (Client) ────────────────────── */}
      {activeTab === "javascript" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <CollapsibleCodeSection
            title="JavaScript (Client)"
            enabled={values.enableJavascript}
            onEnableChange={(val) => update("enableJavascript", val)}
            value={values.javascriptCode}
            onValueChange={(val) => update("javascriptCode", val)}
            placeholder={`// Client-side script. Executes directly in the browser iframe.
// Exposes 'data' / 'input' as local variables containing the API response.
let count = 0;
const btn = document.getElementById('counterBtn');
if (btn) {
  btn.addEventListener('click', () => {
    count++;
    btn.textContent = \`Clicked \${count} times\`;
  });
}`}
            checkboxLabel="Enable JavaScript"
            language="javascript"
            height="180px"
          />
        </div>
      )}
    </form>
  );
}

interface CollapsibleCodeSectionProps {
  title: string;
  enabled: boolean;
  onEnableChange: (enabled: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  checkboxLabel: string;
  language: string;
  height: string;
  onAiGenerate?: () => void;
  aiLoading?: boolean;
  promptValue?: string;
  onPromptChange?: (val: string) => void;
  promptPlaceholder?: string;
}

function CollapsibleCodeSection({
  title,
  enabled,
  onEnableChange,
  value,
  onValueChange,
  placeholder,
  checkboxLabel,
  language,
  height,
  onAiGenerate,
  aiLoading,
  promptValue,
  onPromptChange,
  promptPlaceholder,
}: CollapsibleCodeSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">
          {title}
        </span>
        <div className="flex items-center gap-3">
          {onAiGenerate && (
            <button
              type="button"
              onClick={onAiGenerate}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-all shadow-2xs disabled:opacity-50"
              title="Generate with AI using custom instruction directive"
            >
              {aiLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-purple-600" />
                  <span>Generate with AI</span>
                </>
              )}
            </button>
          )}
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 font-medium select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnableChange(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
            />
            {checkboxLabel}
          </label>
        </div>
      </div>

      {/* Custom AI Instruction Prompt Input (Always visible right away) */}
      {onPromptChange && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={promptValue || ""}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={promptPlaceholder || "Custom AI Instruction Directive..."}
            className="flex-1 px-3 py-1.5 text-xs border border-purple-200/90 rounded-lg outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300 bg-purple-50/50 text-purple-950 font-medium placeholder:text-purple-300/80 transition-all shadow-2xs"
          />
        </div>
      )}

      {enabled && (
        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <CodeEditor
            value={value}
            onChange={onValueChange}
            language={language}
            height={height}
          />
        </div>
      )}
    </div>
  );
}
