import Handlebars from "handlebars";
import jsonata from "jsonata";
// @ts-expect-error json-logic-js does not have official types
import jsonLogic from "json-logic-js";
import { compileTailwind } from "./compile";
import { generateResponseInNaturalLanguage } from "./ResponseInNaturalLanguage";

export interface PipelineOptions {
  method: string;
  endpoint?: string;
  template?: string;
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
 */
export async function fetchDataFromExternalEndpoint(
  method: string,
  endpoint: string,
  executionParams: Record<string, any>
): Promise<any> {
  const fetchOptions: RequestInit = { method };
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
    fetchOptions.headers = { "Content-Type": "application/json" };
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
    const rule = JSON.parse(jsonlogicCode);
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
      const hasStyleTag = /<style[\s>/]/i.test(rendered);
      return hasStyleTag ? rendered : `<style>\n${css}\n</style>\n${rendered}`;
    } catch (err) {
      console.error("Template render error:", err);
      return "<p>Error rendering template</p>";
    }
  }
  // No template — use natural language generator
  return generateResponseInNaturalLanguage(description, data);
}

/**
 * Injects client-side data and scripts into the rendered HTML.
 */
export function injectClientScripts(html: string, data: any, javascriptCode?: string): string {
  const jsonString = JSON.stringify(data).replace(/<\/script/gi, '<\\/script');
  const dataScript = `<script id="aghentooks-data" type="application/json">${jsonString}</script>`;

  let clientJavascriptScript = "";
  if (javascriptCode) {
    clientJavascriptScript = `
<script>
  (function() {
    try {
      const data = JSON.parse(document.getElementById('aghentooks-data').textContent || '{}');
      const input = data;
      ${javascriptCode}
    } catch (err) {
      console.error("Error executing client-side script:", err);
    }
  })();
</script>
`;
  }

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

  return `${html}\n${dataScript}\n${clientJavascriptScript}\n${autoResizeScript}`;
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
  // Determine initial data
  let data: any = executionParams;

  if (options.endpoint && options.method !== "NONE") {
    data = await fetchDataFromExternalEndpoint(options.method, options.endpoint, executionParams);
  }

  // 1. JSONata Transform
  if (options.jsonataCode) {
    data = await applyJsonataTransformation(options.jsonataCode, data);
  }

  // 2. JSON Logic Rule
  if (options.jsonlogicCode) {
    data = applyJsonLogicEvaluation(options.jsonlogicCode, data);
  }

  // Determine CSS
  let css = options.compiledCss || "";
  if (options.template && (forceCompileCss || !css)) {
    css = await compileTailwindCssForTemplate(options.template);
  }

  // Render template
  let html = await renderTemplateHtml(options.template, data, css, options.description);

  // Inject scripts
  html = injectClientScripts(html, data, options.javascriptCode);

  return { html, css, data };
}