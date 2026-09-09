import Handlebars from "handlebars";
import jsonata from "jsonata";
// @ts-expect-error json-logic-js does not have official types
import jsonLogic from "json-logic-js";
import { compileTailwind } from "./compile";
import { generateResponseInNaturalLanguage } from "./ResponseInNaturalLanguage";
import { generateClientSdkScript, wrapClientJavascript } from "./clientSdk/index";

// Register custom Handlebars helpers
Handlebars.registerHelper("firstLetter", (str) => (typeof str === "string" && str.length > 0 ? str.charAt(0).toUpperCase() : ""));
Handlebars.registerHelper("upper", (str) => (typeof str === "string" ? str.toUpperCase() : ""));
Handlebars.registerHelper("lower", (str) => (typeof str === "string" ? str.toLowerCase() : ""));
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("ne", (a, b) => a !== b);
Handlebars.registerHelper("gt", (a, b) => a > b);
Handlebars.registerHelper("gte", (a, b) => a >= b);
Handlebars.registerHelper("lt", (a, b) => a < b);
Handlebars.registerHelper("lte", (a, b) => a <= b);
Handlebars.registerHelper("and", (...args) => args.slice(0, -1).every(Boolean));
Handlebars.registerHelper("or", (...args) => args.slice(0, -1).some(Boolean));
Handlebars.registerHelper("not", (val) => !val);
Handlebars.registerHelper("formatDate", (val) => (val ? new Date(val).toLocaleDateString() : ""));
Handlebars.registerHelper("json", (val) => JSON.stringify(val, null, 2));
Handlebars.registerHelper("default", (val, fallback) => val || fallback);

export interface PipelineOptions {
  method: string;
  endpoint?: string;
  authorization?: string;
  template?: string;
  templateB?: string;
  enableDualTemplate?: boolean;
  compiledCss?: string;
  parameters?: Record<string, unknown>;
  javascriptCode?: string;
  jsonataCode?: string;
  jsonlogicCode?: string;
  description: string;
}

/**
 * Fetches data from an external API endpoint.
 * GET requests pass executionParams as query string parameters.
 * POST/PUT/PATCH requests pass executionParams as JSON body.
 *
 * If `authorization` is provided, an `Authorization: Bearer <token>` header
 * is attached so authenticated external APIs can be called.
 */
export async function fetchDataFromExternalEndpoint(
  method: string,
  endpoint: string,
  executionParams: Record<string, any>,
  authorization?: string
): Promise<any> {
  const fetchOptions: RequestInit = { method };
  const headers: Record<string, string> = {};

  if (authorization && typeof authorization === "string" && authorization.trim()) {
    headers["Authorization"] = `Bearer ${authorization.trim()}`;
  }

  let fetchUrl = endpoint;

  if (method === "GET") {
    try {
      const url = new URL(fetchUrl);
      Object.entries(executionParams).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
      fetchUrl = url.toString();
    } catch {
      // relative or invalid URL format, ignore and proceed
    }
  } else if (["POST", "PUT", "PATCH"].includes(method)) {
    fetchOptions.body = JSON.stringify(executionParams);
    headers["Content-Type"] = "application/json";
  }

  if (Object.keys(headers).length > 0) {
    fetchOptions.headers = headers;
  }

  let response: globalThis.Response;
  try {
    response = await fetch(fetchUrl, fetchOptions);
  } catch (fetchErr: any) {
    console.error("External API connection failed:", fetchErr);
    throw new Error(`Failed to connect to external API at ${fetchUrl}: ${fetchErr.message}`);
  }

  if (!response.ok) {
    throw new Error(`External API responded with status ${response.status}`);
  }

  return response.json().catch(() => response.text());
}

/**
 * Applies a JSONata transformation to data.
 */
export async function applyJsonataTransformation(jsonataCode: string, data: any): Promise<any> {
  try {
    const expr = jsonata(jsonataCode);
    return await expr.evaluate(data);
  } catch (err: any) {
    console.error("JSONata transform error:", err);
    throw new Error(`Failed to execute JSONata query: ${err.message}`);
  }
}

/**
 * Applies JSON Logic rules to data.
 */
export function applyJsonLogicEvaluation(jsonlogicCode: string, data: any): any {
  try {
    // Normalize user-typed bracket paths (e.g. "[0].city" -> "0.city") for seamless evaluation
    const sanitizedCode = jsonlogicCode.replace(/\[(\d+)\]/g, ".$1").replace(/"\./g, "\"").replace(/\.+/g, ".");
    const rule = JSON.parse(sanitizedCode);
    return jsonLogic.apply(rule, data);
  } catch (err: any) {
    console.error("JSON Logic evaluation error:", err);
    throw new Error(`Failed to evaluate JSON Logic rules: ${err.message}`);
  }
}

/**
 * Compiles Tailwind CSS for a given HTML template string.
 */
export async function compileTailwindCssForTemplate(template: string): Promise<string> {
  try {
    return await compileTailwind(template);
  } catch (err) {
    console.error("Tailwind compilation error:", err);
    return "";
  }
}

/**
 * Renders a Handlebars template with data, or falls back to natural language generation.
 */
export async function renderTemplateHtml(
  template: string | undefined,
  data: any,
  css: string,
  description: string
): Promise<string> {
  if (template) {
    try {
      const templateFn = Handlebars.compile(template);
      const rendered = templateFn(data);
      const baseResetCss = `<style>html, body { margin: 0; padding: 0; min-height: auto !important; height: auto !important; box-sizing: border-box; }</style>`;
      const hasStyleTag = /<style[\s>/]/i.test(rendered);
      return hasStyleTag ? `${baseResetCss}\n${rendered}` : `${baseResetCss}\n<style>\n${css}\n</style>\n${rendered}`;
    } catch (err: any) {
      console.error("Template render error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return `<div style="padding: 16px; background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 12px; font-family: system-ui, -apple-system, sans-serif; font-size: 13px;">
  <strong style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 600;">Handlebars Template Render Error</strong>
  <p style="margin: 0 0 8px 0; color: #7f1d1d;">The template contains a syntax error or invalid expression:</p>
  <pre style="margin: 0; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 12px; background: rgba(0,0,0,0.04); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.06);">${errMsg}</pre>
</div>`;
    }
  }
  // No template — use natural language generator
  return generateResponseInNaturalLanguage(description, data);
}

/**
 * Injects client-side data and scripts into the rendered HTML.
 */
export function injectClientScripts(html: string, data: any, javascriptCode?: string): string {
  // NOTE: Element ID "aghentooks-data" is intentionally kept as-is (legacy spelling with transposed letters).
  // wrapClientJavascript in clientSdk/index.ts reads this same ID — both sides must stay in sync.
  const jsonString = (JSON.stringify(data ?? {}) || "{}").replace(/<\/script/gi, '<\\/script');
  const dataScript = `<script id="aghentooks-data" type="application/json">${jsonString}</script>`;

  const apiHelperScript = generateClientSdkScript();
  const clientJavascriptScript = javascriptCode ? wrapClientJavascript(javascriptCode) : "";

  const autoResizeScript = `
<script>
  (function() {
    function sendHeight() {
      const body = document.body;
      const html = document.documentElement;
      const height = Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.clientHeight : 0,
        html ? html.scrollHeight : 0,
        html ? html.offsetHeight : 0
      );
      if (height > 0) {
        window.parent.postMessage({ type: 'resize-iframe', height }, '*');
      }
    }
    window.addEventListener('load', sendHeight);
    window.addEventListener('resize', sendHeight);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(sendHeight);
      if (document.body) ro.observe(document.body);
    } else if (window.MutationObserver) {
      const observer = new MutationObserver(sendHeight);
      if (document.body) observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    }
    sendHeight();
  })();
</script>
`;

  const lucideScript = `
<script src="https://unpkg.com/lucide@latest"></script>
<script>
  (function() {
    function initLucide() {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initLucide);
    } else {
      initLucide();
    }
  })();
</script>
`;

  return `${html}\n${dataScript}\n${apiHelperScript}\n${clientJavascriptScript}\n${autoResizeScript}\n${lucideScript}`;
}

/**
 * Main pipeline orchestrator.
 *
 * Steps:
 * 1. If endpoint and method are provided (and method !== "NONE"), fetch external data
 * 2. Apply JSONata transformation if configured
 * 3. Apply JSON Logic rules if configured
 * 4. Compile Tailwind CSS if needed
 * 5. Render Handlebars template (or natural language fallback)
 * 6. Inject client-side data and scripts
 *
 * Returns the final HTML string, the compiled CSS, and the processed data.
 */
export async function runPipeline(
  options: PipelineOptions,
  executionParams: Record<string, any>,
  forceCompileCss = false
): Promise<{ html: string; css: string; data: any }> {
  // Parse saved default parameters if present
  let defaultParams: Record<string, any> = {};
  if (options.parameters) {
    if (typeof options.parameters === "string") {
      try {
        defaultParams = JSON.parse(options.parameters);
      } catch {
        defaultParams = {};
      }
    } else if (typeof options.parameters === "object") {
      defaultParams = options.parameters as Record<string, any>;
    }
  }

  const hasExecutionParams =
    executionParams && typeof executionParams === "object" && Object.keys(executionParams).length > 0;

  // Determine initial data
  let data: any;

  if (options.endpoint && options.method && options.method !== "NONE") {
    const fetchParams = hasExecutionParams ? executionParams : defaultParams;
    data = await fetchDataFromExternalEndpoint(
      options.method,
      options.endpoint,
      fetchParams,
      options.authorization
    );
  } else {
    // Static / mock endpoint: merge default sample parameters with executionParams
    data = { ...defaultParams, ...(executionParams || {}) };
  }

  // Fallback if data is empty but default parameters are available
  if ((!data || (typeof data === "object" && Object.keys(data).length === 0)) && Object.keys(defaultParams).length > 0) {
    data = defaultParams;
  }

  // 1. JSONata Transform
  if (options.jsonataCode) {
    try {
      data = await applyJsonataTransformation(options.jsonataCode, data);
      console.log("[Pipeline Debug] Data after JSONata transform:", JSON.stringify(Array.isArray(data) ? data[0] : data));
    } catch (err) {
      console.error("[Pipeline Debug] JSONata transform error:", err);
    }
  }

  // 2. JSON Logic Rule Evaluation
  let logicResult: any = null;
  if (options.jsonlogicCode) {
    logicResult = applyJsonLogicEvaluation(options.jsonlogicCode, data);
    console.log("[Pipeline Debug] JSON Logic Rule:", options.jsonlogicCode.trim());
    console.log("[Pipeline Debug] JSON Logic Evaluation Result:", logicResult);
  }

  // Determine active template (Template A vs Template B) based on dual template mode & logicResult
  let selectedTemplate = options.template || "";
  if (options.enableDualTemplate && options.templateB) {
    const isFalseResult =
      logicResult === false ||
      logicResult === 0 ||
      logicResult === "Fail" ||
      logicResult === "false" ||
      logicResult === "B" ||
      logicResult === null ||
      logicResult === undefined;
    if (isFalseResult) {
      selectedTemplate = options.templateB;
    }
  }
  console.log("[Pipeline Debug] enableDualTemplate:", options.enableDualTemplate, "isFalseResult:", logicResult === false, "selectedTemplate:", selectedTemplate === options.templateB ? "Template B" : "Template A");

  // Determine CSS
  let css = options.compiledCss || "";
  if (selectedTemplate && (forceCompileCss || !css)) {
    css = await compileTailwindCssForTemplate(selectedTemplate);
  }

  // Render template
  let html = await renderTemplateHtml(selectedTemplate, data, css, options.description);

  // Inject scripts
  html = injectClientScripts(html, data, options.javascriptCode);

  return { html, css, data };
}