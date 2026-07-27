import { tool, jsonSchema } from "ai";
import { ObjectId } from "mongodb";
import mongoclient from "../dbclient";
import { runPipeline } from "../services/pipeline";

/**
 * Fetches endpoint documents from the agenthooks database for a given user
 * and converts each one into an AI SDK tool that the LLM can invoke.
 *
 * If `collectionId` is provided, only endpoints belonging to that collection
 * are loaded. Otherwise, all endpoints for the user are loaded.
 *
 * Each tool's `description` is set to the endpoint's `description` field,
 * so the LLM can match natural language input to the right endpoint.
 * The `inputSchema` is derived from the endpoint's `parameters` field.
 * The `execute` function runs the full pipeline (fetch → transform → render).
 */
export async function getDynamicEndpointsTools(userId: string, collectionId?: string) {
  try {
    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoints");

    // Build query filter — always scope to the user
    const query: any = { userId };

    // If a collection is specified, resolve its endpointIds and filter further
    if (collectionId) {
      const collectionsColl = db.collection("endpoint_collections");
      const colDoc = await collectionsColl.findOne({
        _id: new ObjectId(collectionId),
        userId,
      });
      if (colDoc && Array.isArray(colDoc.endpointIds) && colDoc.endpointIds.length > 0) {
        query._id = { $in: colDoc.endpointIds.map((id: any) => new ObjectId(id)) };
      } else {
        // Collection exists but has no endpoints — return empty
        return [];
      }
    }

    const endpoints = await collection.find(query).toArray();

    const dynamicTools = endpoints.map((endpointDoc) => {
      const toolName = `endpoint_${endpointDoc._id.toString()}`;

      // Build input schema from the endpoint's parameters definition
      const inputSchema = (endpointDoc.parameters
        ? jsonSchema(endpointDoc.parameters)
        : jsonSchema({
            type: "object",
            properties: {},
            additionalProperties: false,
          })) as any;

      const endpointTool = tool({
        description: endpointDoc.description,
        inputSchema,
        execute: async (args: Record<string, any>) => {
          try {
            const pipelineResult = await runPipeline(
              {
                method: endpointDoc.method,
                endpoint: endpointDoc.endpoint,
                template: endpointDoc.template,
                compiledCss: endpointDoc.compiledCss,
                parameters: endpointDoc.parameters,
                javascriptCode:
                  endpointDoc.javascriptCode ||
                  (endpointDoc.scriptType === "javascript" ? endpointDoc.scriptCode : ""),
                jsonataCode:
                  endpointDoc.jsonataCode ||
                  (endpointDoc.scriptType === "jsonata" ? endpointDoc.scriptCode : ""),
                jsonlogicCode:
                  endpointDoc.jsonlogicCode ||
                  (endpointDoc.scriptType === "jsonlogic" ? endpointDoc.scriptCode : ""),
                description: endpointDoc.description,
              },
              args
            );

            return {
              success: true,
              data: pipelineResult.data,
              html: pipelineResult.html,
              hasTemplate: !!endpointDoc.template,
            };
          } catch (error) {
            console.error(
              `Error executing endpoint ${endpointDoc.endpoint}:`,
              error
            );
            return {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown execution error",
            };
          }
        },
      });

      return {
        tool: endpointTool,
        name: toolName,
        context: "endpoints",
      };
    });

    return dynamicTools;
  } catch (error) {
    console.error("Fatal error fetching dynamic tools from MongoDB:", error);
    return [];
  }
}