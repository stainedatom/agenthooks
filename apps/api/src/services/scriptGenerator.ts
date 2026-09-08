import jsonata from "jsonata";
// @ts-expect-error json-logic-js does not have official types
import jsonLogic from "json-logic-js";
import { createOllama } from "ollama-ai-provider-v2";
import { generateText } from "ai";
import { config } from "../config";

const ollama = createOllama({
  baseURL: config.ollamaBaseUrl,
  headers: config.ollamaApiKey ? { Authorization: `Bearer ${config.ollamaApiKey}` } : undefined,
});

/**
 * Fallback JSONata generator when AI provider is offline or throws an error.
 */
export function generateFallbackJsonataCode(sampleData: unknown): string {
  if (sampleData && typeof sampleData === "object") {
    if (Array.isArray(sampleData)) {
      const first = sampleData[0];
      if (first && typeof first === "object") {
        const keys = Object.keys(first).slice(0, 5);
        const projection = keys.map((k) => `"${k}": ${k}`).join(",\n  ");
        return `$.{\n  ${projection}\n}`;
      }
      return "$";
    }
    // Check if root object has an array property (e.g. products, items, data)
    const keys = Object.keys(sampleData);
    for (const k of keys) {
      const val = (sampleData as any)[k];
      if (Array.isArray(val) && val.length > 0) {
        const first = val[0];
        if (first && typeof first === "object") {
          const itemKeys = Object.keys(first).slice(0, 5);
          const projection = itemKeys.map((ik) => `"${ik}": ${ik}`).join(",\n  ");
          return `${k}.{\n  ${projection}\n}`;
        }
        return `${k}`;
      }
    }
    if (keys.length > 0) {
      const projection = keys.slice(0, 5).map((k) => `"${k}": ${k}`).join(",\n  ");
      return `{\n  ${projection}\n}`;
    }
  }
  return "$";
}

/**
 * Fallback JSON Logic generator when AI provider is offline or throws an error.
 */
export function generateFallbackJsonlogicCode(sampleData: unknown): string {
  if (Array.isArray(sampleData) && sampleData.length > 0) {
    const first = sampleData[0];
    if (first && typeof first === "object") {
      const keys = Object.keys(first);
      const strKey = keys.find((k) => typeof first[k] === "string");
      if (strKey) {
        return JSON.stringify(
          {
            "==": [{ var: `0.${strKey}` }, first[strKey]],
          },
          null,
          2
        );
      }
    }
  }
  if (sampleData && typeof sampleData === "object" && !Array.isArray(sampleData)) {
    const keys = Object.keys(sampleData);
    const numKey = keys.find((k) => typeof (sampleData as any)[k] === "number");
    if (numKey) {
      const val = (sampleData as any)[numKey];
      return JSON.stringify(
        {
          if: [{ ">": [{ var: numKey }, Math.floor(val / 2)] }, "Pass", "Fail"],
        },
        null,
        2
      );
    }
  }
  return JSON.stringify({ "==": [{ var: "0.city" }, "kilcoole"] }, null, 2);
}

/**
 * Fallback Client-side JavaScript generator when AI provider is offline or throws an error.
 */
export function generateFallbackJavascriptCode(): string {
  return `// Client-side script. Executes directly in the browser iframe.
// Exposes 'data' / 'input' as local variables containing the API response.
// Built-in global API helpers:
//   downloadFile(filename, content, mimeType) or downloadFile({ filename, content, mimeType })
//   postMessageToHost(type, payload)
console.log("Pipeline data loaded:", data);`;
}

/**
 * Generates a valid JSONata query based on custom instruction prompt and sample data.
 */
export async function generateJsonataCode(
  instruction: string,
  sampleData: unknown
): Promise<string> {
  const jsonSample = sampleData ? JSON.stringify(sampleData, null, 2) : "{}";
  const userDirective = instruction && instruction.trim() ? instruction.trim() : "Filter and project relevant data fields";

  const prompt = `You are a JSONata data transformation expert.
Generate a valid JSONata query string based on the provided Input Data JSON and Custom Instruction Directive.

CUSTOM INSTRUCTION DIRECTIVE: "${userDirective}"

INPUT DATA JSON:
${jsonSample}

CRITICAL RULES:
1. Output ONLY the raw executable JSONata query string — NO markdown fences (no \`\`\`jsonata), NO preamble, NO explanation text.
2. The JSONata query MUST compile and evaluate without errors against the provided Input Data JSON.
3. For array projections, use dot syntax like \`array.{\`key\`: value}\` or \`$[filter].{\`key\`: value}\`. Do NOT use bracket syntax \`array[{\`key\`: value}]\`.`;

  try {
    const { text } = await generateText({
      model: ollama.chat(config.aiModel),
      prompt,
    });

    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:jsonata)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Sanitize accidental array bracket syntax
    cleaned = cleaned.replace(/([a-zA-Z0-9_\$]+)\[\s*\{/g, "$1.{");

    // Validate execution with jsonata
    try {
      const expr = jsonata(cleaned);
      const res = await expr.evaluate(sampleData);
      if (res !== undefined) {
        return cleaned;
      }
    } catch (err) {
      console.warn("AI generated JSONata query failed compilation/evaluation, trying fallback:", err);
    }

    return generateFallbackJsonataCode(sampleData);
  } catch (err) {
    console.error("AI JSONata generation error:", err);
    return generateFallbackJsonataCode(sampleData);
  }
}

/**
 * Generates a valid JSON Logic rule based on custom instruction prompt and sample data.
 */
export async function generateJsonlogicCode(
  instruction: string,
  sampleData: unknown
): Promise<string> {
  const jsonSample = sampleData ? JSON.stringify(sampleData, null, 2) : "{}";
  const userDirective = instruction && instruction.trim() ? instruction.trim() : "Evaluate data conditions";

  const prompt = `You are a JSON Logic rule evaluation expert.
Generate a valid JSON Logic rule JSON object based on the provided Input Data JSON and Custom Instruction Directive.

CUSTOM INSTRUCTION DIRECTIVE: "${userDirective}"

INPUT DATA JSON:
${jsonSample}

CRITICAL RULES:
1. Output ONLY the valid raw JSON object string representing the JSON Logic rule — NO markdown fences (no \`\`\`json), NO preamble, NO explanation text.
2. The JSON Logic rule MUST be a valid JSON object executable with json-logic-js (using operators like "if", ">", "<", "==", "var", "and", "or").
3. ARRAY INDEXING RULE FOR JSON LOGIC "var":
   - ALWAYS use dot notation WITHOUT brackets for array indexing in "var" paths.
   - Example for array item 0 property: "0.city" or "0.address.city".
   - NEVER use square brackets like "[0].city" or "items[0].city". Square brackets cause execution failures in json-logic-js.
4. Reference property keys present in the Input Data JSON using {"var": "key"}.`;

  try {
    const { text } = await generateText({
      model: ollama.chat(config.aiModel),
      prompt,
    });

    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Sanitize array bracket syntax in "var" paths (e.g. "[0].city" -> "0.city", "items[0].city" -> "items.0.city")
    cleaned = cleaned.replace(/\[(\d+)\]/g, ".$1").replace(/"\./g, "\"").replace(/\.+/g, ".");

    // Validate execution with jsonLogic
    try {
      const parsedRule = JSON.parse(cleaned);
      jsonLogic.apply(parsedRule, sampleData || {});
      return JSON.stringify(parsedRule, null, 2);
    } catch (err) {
      console.warn("AI generated JSON Logic rule failed execution, using fallback:", err);
    }

    return generateFallbackJsonlogicCode(sampleData);
  } catch (err) {
    console.error("AI JSON Logic generation error:", err);
    return generateFallbackJsonlogicCode(sampleData);
  }
}

/**
 * Generates valid client-side JavaScript code based on custom instruction prompt and sample data.
 */
export async function generateJavascriptCode(
  instruction: string,
  sampleData: unknown
): Promise<string> {
  const jsonSample = sampleData ? JSON.stringify(sampleData, null, 2) : "{}";
  const userDirective = instruction && instruction.trim() ? instruction.trim() : "Interactive client widget behavior";

  const prompt = `You are an expert front-end JavaScript developer.
Generate browser-compatible client-side JavaScript code to enhance an embedded UI widget.

CUSTOM INSTRUCTION DIRECTIVE: "${userDirective}"

AVAILABLE DATA (exposed as local variable 'data'):
${jsonSample}

BUILT-IN GLOBAL API HELPERS (AVAILABLE DIRECTLY):
- downloadFile(filename, content, mimeType) or downloadFile({ filename, content, mimeType }): Triggers a browser file download from the sandbox iframe.
- postMessageToHost(type, payload): Sends a postMessage event to the parent host window.

CRITICAL RULES:
1. Output ONLY the raw executable JavaScript code string — NO markdown fences (no \`\`\`js or \`\`\`javascript), NO preamble, NO HTML tags.
2. The code will execute inside an iframe scope where the local variable 'data' contains the JSON response object/array.
3. Keep the script clean, performant, and error-safe. Add interactive DOM event listeners or logging if appropriate.`;

  try {
    const { text } = await generateText({
      model: ollama.chat(config.aiModel),
      prompt,
    });

    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:js|javascript)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Basic syntax check
    try {
      new Function("data", cleaned);
      return cleaned;
    } catch (err) {
      console.warn("AI generated JavaScript failed syntax check, using fallback:", err);
    }

    return generateFallbackJavascriptCode();
  } catch (err) {
    console.error("AI JavaScript generation error:", err);
    return generateFallbackJavascriptCode();
  }
}
