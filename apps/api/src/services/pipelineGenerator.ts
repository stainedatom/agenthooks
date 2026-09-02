import jsonata from "jsonata";
import { generateHandlebarsTemplate } from "./templateGenerator";
import {
  generateJsonataCode,
  generateFallbackJsonataCode,
  generateJsonlogicCode,
  generateFallbackJsonlogicCode,
  generateJavascriptCode,
  generateFallbackJavascriptCode,
} from "./scriptGenerator";

export interface FullPipelineConfig {
  enableJsonata: boolean;
  jsonataCode: string;
  enableJsonlogic: boolean;
  jsonlogicCode: string;
  enableTemplate: boolean;
  template: string;
  templateB: string;
  enableDualTemplate: boolean;
  enableJavascript: boolean;
  javascriptCode: string;
}

/**
 * Master AI Full Pipeline Orchestrator (Sequential 4-Step Synthesis)
 * Step 1: Generates & validates JSONata data transformation.
 * Step 2: Generates & validates JSON Logic condition rule.
 * Step 3: Generates Dual Handlebars UI Templates (Template A for True/Pass, Template B for False/Fail).
 * Step 4: Generates Client-side interactive JavaScript.
 */
export async function generateFullPipeline(
  description: string,
  sampleData: unknown,
  instruction?: string
): Promise<FullPipelineConfig> {
  const directive = instruction && instruction.trim() ? instruction.trim() : description;

  // Step 1: Generate JSONata transformation
  let jsonataCode = "";
  let currentData = sampleData;

  try {
    jsonataCode = await generateJsonataCode(directive, sampleData);
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

  // Step 2: Generate JSON Logic condition rule
  let jsonlogicCode = "";
  try {
    jsonlogicCode = await generateJsonlogicCode(directive, currentData);
  } catch (err) {
    console.warn("Pipeline generator JSON Logic step failed, using fallback:", err);
    jsonlogicCode = generateFallbackJsonlogicCode(currentData);
  }

  // Step 3: Generate Dual UI Templates (Template A for True/Pass state, Template B for False/Fail state)
  const templatePromise = generateHandlebarsTemplate(`${directive} (Light Theme / Primary Pass State)`, currentData);
  const templateBPromise = generateHandlebarsTemplate(`${directive} (Dark Theme / Alternate Alert State)`, currentData);

  // Step 4: Generate Client-side interactive JavaScript
  const javascriptPromise = generateJavascriptCode(directive, currentData);

  const [template, templateB, javascriptCode] = await Promise.all([
    templatePromise,
    templateBPromise,
    javascriptPromise,
  ]);

  const enableJsonata = Boolean(jsonataCode && jsonataCode !== "$");
  const enableJsonlogic = Boolean(jsonlogicCode);
  const enableJavascript = Boolean(javascriptCode);

  return {
    enableJsonata,
    jsonataCode: enableJsonata ? jsonataCode : "",
    enableJsonlogic,
    jsonlogicCode: enableJsonlogic ? jsonlogicCode : "",
    enableTemplate: true,
    template,
    templateB,
    enableDualTemplate: true,
    enableJavascript,
    javascriptCode: enableJavascript ? javascriptCode : "",
  };
}
