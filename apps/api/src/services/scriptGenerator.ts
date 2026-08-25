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
    const firstKey = keys[0];
    if (firstKey) {
      return JSON.stringify(
        {
          if: [{ "!!": { var: firstKey } }, "Valid", "Invalid"],
        },
        null,
        2
      );
    }
  }
  return JSON.stringify({ "==": [1, 1] }, null, 2);
}

/**
 * Generates a valid JSONata query based on endpoint description and sample data.
 */
export async function generateJsonataCode(
  description: string,
  sampleData: unknown
): Promise<string> {
  const jsonSample = sampleData ? JSON.stringify(sampleData, null, 2) : "{}";

  const prompt = `You are a JSONata query language expert.
Generate a valid JSONata transformation query based on the input data and description.

Description: "${description}"
Input Data JSON:
${jsonSample}

CRITICAL RULES:
1. Output ONLY the raw JSONata query code block — NO markdown fences (no \`\`\`jsonata), NO preamble, NO explanation text.
2. SYNTAX SPECIFICATION: In JSONata, array mapping/projection uses a DOT followed by braces: e.g. \`products.{ "productName": title, "price": price }\` or \`products[price < 20].{ "productName": title, "price": price }\`. NEVER write \`products[{ ... }]\` without a dot!
3. ARRAY PROPERTIES: If Input Data JSON is an object with an array property (e.g. "products", "items", "data"), target that array property: e.g. \`products[price < 20].{ "productName": title, "price": price }\`.
4. NUMERIC FILTERS: Convert price or numeric filter conditions to plain numbers without currency symbols: e.g. use \`price < 20\` (NOT \`price < 20$\`).
5. FIELD MATCHING: Match the actual property names in Input Data JSON (e.g. if the JSON uses "title" for product name, reference "title").
6. Output a clean, valid JSONata expression that returns the filtered/transformed dataset.`;

  try {
    const { text } = await generateText({
      model: ollama.chat(config.aiModel),
      prompt,
    });

    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:jsonata|json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Validate compilation AND evaluation with jsonata
    try {
      const expr = jsonata(cleaned);
      const evalResult = await expr.evaluate(sampleData);
      if (evalResult !== undefined) {
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
 * Generates a valid JSON Logic rule based on endpoint description and sample data.
 */
export async function generateJsonlogicCode(
  description: string,
  sampleData: unknown
): Promise<string> {
  const jsonSample = sampleData ? JSON.stringify(sampleData, null, 2) : "{}";

  const prompt = `You are a JSON Logic rule evaluation expert.
Generate a valid JSON Logic rule JSON object based on the following input data and description.

Description: "${description}"
Input Data JSON:
${jsonSample}

CRITICAL RULES:
1. Output ONLY the valid raw JSON object string representing the JSON Logic rule — NO markdown fences (no \`\`\`json), NO preamble, NO explanation text.
2. The JSON Logic rule MUST be a valid JSON object executable with json-logic-js (using operators like "if", ">", "<", "==", "var", "and", "or").
3. Reference property keys present in the Input Data JSON using {"var": "key"}.`;

  try {
    const { text } = await generateText({
      model: ollama.chat(config.aiModel),
      prompt,
    });

    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

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
