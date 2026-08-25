import jsonata from "jsonata";
import { generateHandlebarsTemplate } from "./templateGenerator";
import { generateJsonataCode, generateFallbackJsonataCode } from "./scriptGenerator";

export interface FullPipelineConfig {
  enableJsonata: boolean;
  jsonataCode: string;
  enableJsonlogic: boolean;
  jsonlogicCode: string;
  enableTemplate: boolean;
  template: string;
  enableJavascript: boolean;
  javascriptCode: string;
}

/**
 * Master AI Full Pipeline Orchestrator (Sequential 2-Step Synthesis)
 * Step 1: Generates & validates JSONata data transformation.
 * Step 2: Generates UI Handlebars template tailored specifically to the transformed dataset.
 */
export async function generateFullPipeline(
  description: string,
  sampleData: unknown
): Promise<FullPipelineConfig> {
  // Step 1: Generate JSONata transformation
  let jsonataCode = "";
  let currentData = sampleData;

  try {
    jsonataCode = await generateJsonataCode(description, sampleData);
    if (jsonataCode && jsonataCode !== "$") {
      const expr = jsonata(jsonataCode);
      const evaluated = await expr.evaluate(sampleData);
      if (evaluated !== undefined) {
        currentData = evaluated;
      }
    }
  } catch (err) {
    console.warn("Pipeline generator JSONata step failed, using fallback:", err);
    jsonataCode = generateFallbackJsonataCode(sampleData);
    try {
      const expr = jsonata(jsonataCode);
      const evaluated = await expr.evaluate(sampleData);
      if (evaluated !== undefined) {
        currentData = evaluated;
      }
    } catch {
      currentData = sampleData;
    }
  }

  // Step 2: Generate Handlebars UI Template tailored specifically for currentData (transformed payload)
  const template = await generateHandlebarsTemplate(description, currentData);

  const enableJsonata = Boolean(jsonataCode && jsonataCode !== "$");

  return {
    enableJsonata,
    jsonataCode: enableJsonata ? jsonataCode : "",
    enableJsonlogic: false,
    jsonlogicCode: "",
    enableTemplate: true,
    template,
    enableJavascript: false,
    javascriptCode: "",
  };
}
