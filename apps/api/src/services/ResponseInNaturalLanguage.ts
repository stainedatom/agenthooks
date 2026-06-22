import { createOllama } from "ollama-ai-provider-v2";
import { generateText } from "ai";
import { marked } from "marked";
import { config } from "../config";

const ollama = createOllama({
  baseURL: config.ollamaBaseUrl,
  headers: config.ollamaApiKey ? { Authorization: `Bearer ${config.ollamaApiKey}` } : undefined,
});

export async function generateResponseInNaturalLanguage(
  description: string,
  data: unknown
): Promise<string> {
  const prompt = `You are given an API endpoint with the following description: "${description}"

The API returned this data:
${JSON.stringify(data, null, 2)}

Describe this data in plain, natural language. Be concise and informative. Focus on what the data represents and highlight any important values.`;

  try {
    const { text } = await generateText({
      model: ollama.chat(config.aiModel),
      prompt,
    });
    return marked(text);
  } catch (err) {
    console.error("Ollama text generation error:", err);
    return JSON.stringify(data, null, 2);
  }
}
