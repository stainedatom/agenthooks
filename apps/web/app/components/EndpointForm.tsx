"use client";

export interface EndpointFormValues {
  description: string;
  method: string;
  endpoint: string;
  parameters: string;
  enableJsonata: boolean;
  jsonataCode: string;
  enableJsonlogic: boolean;
  jsonlogicCode: string;
  enableTemplate: boolean;
  template: string;
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
  enableJsonlogic: false,
  jsonlogicCode: "",
  enableTemplate: false,
  template: "",
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
}: EndpointFormProps) {
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
            className="text-red-400 hover:text-red-600 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* ─── Section 1: Data Source ─────────────────────────── */}
      <div className="flex flex-col gap-4">
        <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">
          1. Data Source
        </span>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition-all bg-gray-50/50 focus:bg-white"
            placeholder="Displays user dashboard summary"
          />
        </div>

        {/* HTTP Method picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">HTTP Method</label>
          <div className="flex flex-wrap gap-2">
            {["GET", "POST", "PUT", "PATCH", "DELETE", "NONE"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update("method", m)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 ${
                  values.method === m
                    ? METHOD_ACTIVE_STYLES[m]
                    : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint URL (hidden when method is NONE) */}
        {values.method !== "NONE" && (
          <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
            <label className="text-sm font-medium text-gray-700">
              Endpoint URL{" "}
              <span className="text-gray-400 font-normal text-xs">(Optional)</span>
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
          <textarea
            value={values.parameters}
            onChange={(e) => update("parameters", e.target.value)}
            className="px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono min-h-[100px] outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner focus:ring-1 focus:ring-gray-400"
            placeholder={
              values.method === "NONE"
                ? '{\n  "terms": 7\n}'
                : '{\n  "limit": 10,\n  "status": "active"\n}'
            }
          />
          <p className="text-xxs text-gray-400 mt-1">
            {values.method === "NONE"
              ? "Provide the JSON payload that your script will execute on (accessible as the 'input' object)."
              : "Provide query or request body parameters in JSON format. These will be automatically sent with the external API call."}
          </p>
        </div>
      </div>

      <hr className="border-gray-150" />

      {/* ─── Section 2: JSONata Transformation ──────────────── */}
      <CollapsibleCodeSection
        title="2. JSONata Transformation"
        enabled={values.enableJsonata}
        onEnableChange={(val) => update("enableJsonata", val)}
        value={values.jsonataCode}
        onValueChange={(val) => update("jsonataCode", val)}
        placeholder={`/* JSONata query to transform input JSON */\n{\n  "title": title,\n  "items": [items]\n}`}
        checkboxLabel="Enable JSONata"
        minHeightClass="min-h-[120px]"
      />

      <hr className="border-gray-150" />

      {/* ─── Section 3: JSON Logic Evaluation ───────────────── */}
      <CollapsibleCodeSection
        title="3. JSON Logic Evaluation"
        enabled={values.enableJsonlogic}
        onEnableChange={(val) => update("enableJsonlogic", val)}
        value={values.jsonlogicCode}
        onValueChange={(val) => update("jsonlogicCode", val)}
        placeholder={`/* JSON Logic rule validation or transformation */\n{\n  "if": [\n    { ">": [{ "var": "temp" }, 25] },\n    "Warm",\n    "Cool"\n  ]\n}`}
        checkboxLabel="Enable JSON Logic"
        minHeightClass="min-h-[120px]"
      />

      <hr className="border-gray-150" />

      {/* ─── Section 4: UI Template ──────────────────────────── */}
      <CollapsibleCodeSection
        title="4. UI Template"
        enabled={values.enableTemplate}
        onEnableChange={(val) => update("enableTemplate", val)}
        value={values.template}
        onValueChange={(val) => update("template", val)}
        placeholder={`<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left">\n  <h2 class="text-xl font-bold text-gray-900">{{title}}</h2>\n  <p class="text-gray-600 mt-2">{{summary}}</p>\n</div>`}
        checkboxLabel="Enable Template"
        minHeightClass="min-h-[200px]"
        textareaClassName="px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition-all font-mono"
      />

      <hr className="border-gray-150" />

      {/* ─── Section 5: JavaScript (Client) ─────────────────── */}
      <CollapsibleCodeSection
        title="5. JavaScript (Client)"
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
        minHeightClass="min-h-[160px]"
      />
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
  minHeightClass: string;
  textareaClassName?: string;
}

function CollapsibleCodeSection({
  title,
  enabled,
  onEnableChange,
  value,
  onValueChange,
  placeholder,
  checkboxLabel,
  minHeightClass,
  textareaClassName = "px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-xs font-mono outline-none focus:border-gray-400 focus:bg-white transition-all shadow-inner focus:ring-1 focus:ring-gray-400",
}: CollapsibleCodeSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-xxs font-bold text-gray-400 tracking-wider uppercase">
          {title}
        </span>
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
      {enabled && (
        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <textarea
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className={`${textareaClassName} ${minHeightClass}`}
            placeholder={placeholder}
          />
        </div>
      )}
    </div>
  );
}
