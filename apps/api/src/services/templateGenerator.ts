import Handlebars from "handlebars";
import { createOllama } from "ollama-ai-provider-v2";
import { generateText } from "ai";
import { config } from "../config";

const ollama = createOllama({
  baseURL: config.ollamaBaseUrl,
  headers: config.ollamaApiKey ? { Authorization: `Bearer ${config.ollamaApiKey}` } : undefined,
});

/**
 * Fallback structural template generator when AI provider is offline or throws an error.
 */
export function generateFallbackHandlebarsTemplate(
  description: string,
  sampleData: unknown
): string {
  if (!sampleData || typeof sampleData !== "object") {
    return `<div class="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
  <h3 class="text-sm font-bold text-gray-900 mb-1">${description || "Data Overview"}</h3>
  <p class="text-xs text-gray-600">{{this}}</p>
</div>`;
  }

  if (Array.isArray(sampleData)) {
    const firstItem = sampleData[0];
    if (firstItem && typeof firstItem === "object") {
      const keys = Object.keys(firstItem).slice(0, 5);
      const tableHeaders = keys.map((k) => `<th class="px-3 py-2 text-left text-xxs font-semibold text-gray-500 uppercase">${k}</th>`).join("\n        ");
      const tableCells = keys.map((k) => `<td class="px-3 py-2 text-xs text-gray-700 truncate max-w-[150px]">{{${k}}}</td>`).join("\n        ");

      return `<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
  <div class="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
    <h3 class="text-sm font-bold text-gray-900">${description || "Data List"}</h3>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-100">
      <thead class="bg-gray-50">
        <tr>
          ${tableHeaders}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        {{#each this}}
        <tr class="hover:bg-gray-50/50">
          ${tableCells}
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
</div>`;
    }

    return `<div class="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
  <h3 class="text-sm font-bold text-gray-900 mb-3">${description || "Items"}</h3>
  <ul class="space-y-1.5">
    {{#each this}}
    <li class="text-xs text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{{this}}</li>
    {{/each}}
  </ul>
</div>`;
  }

  // Object
  const keys = Object.keys(sampleData);
  const fields = keys
    .map(
      (k) => `  <div class="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
    <span class="text-xs font-medium text-gray-500">${k}</span>
    <span class="text-xs font-semibold text-gray-900 truncate max-w-[200px]">{{${k}}}</span>
  </div>`
    )
    .join("\n");

  return `<div class="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
  <h3 class="text-sm font-bold text-gray-900 mb-3">${description || "Summary"}</h3>
  <div class="space-y-1">
${fields}
  </div>
</div>`;
}

/**
 * Generates a clean, modern Handlebars HTML template with Tailwind CSS classes using AI.
 */
export async function generateHandlebarsTemplate(
  description: string,
  sampleData: unknown
): Promise<string> {
  const jsonSample = sampleData ? JSON.stringify(sampleData, null, 2) : "{}";

  const prompt = `You are an expert UI designer and frontend developer.
Generate a modern, beautiful Handlebars HTML template snippet styled with Tailwind CSS utility classes.

Endpoint Description: "${description}"
Sample Mock Data JSON:
${jsonSample}

CRITICAL RULES:
1. Output ONLY the raw Handlebars HTML code block — NO markdown fences (no \`\`\`html), NO preamble, NO explanation.
2. Do NOT include <html>, <head>, or <body> tags — return only the inner UI component container (e.g., <div class="...">...</div>).
3. Use standard Handlebars syntax (e.g. {{key}}, {{#each list}}...{{/each}}, {{#if condition}}...{{/if}}).
4. Style with clean, modern Tailwind CSS classes (class="...", NOT className="..."). Use rounded-xl, border, shadow-sm, flex, grid, modern typography, muted badges, subtle hover states.
5. Ensure all data fields present in the sample JSON are tastefully presented.
6. Every block helper like {{#if}} or {{#each}} MUST have a matching {{/if}} or {{/each}} closing tag. Do NOT use non-standard helpers.`;

  try {
    const { text } = await generateText({
      model: ollama.chat(config.aiModel),
      prompt,
    });

    let cleaned = text.trim();
    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();

    if (cleaned.startsWith("<")) {
      // Validate that Handlebars can compile AND evaluate the AI generated template
      try {
        const fn = Handlebars.compile(cleaned);
        fn(sampleData || {});
        return cleaned;
      } catch (compileErr) {
        console.warn("AI generated template failed Handlebars compilation/evaluation test, falling back:", compileErr);
      }
    }

    return generateFallbackHandlebarsTemplate(description, sampleData);
  } catch (err) {
    console.error("AI template generation error:", err);
    return generateFallbackHandlebarsTemplate(description, sampleData);
  }
}
