import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import Handlebars from "handlebars";
import jsonata from "jsonata";
// @ts-expect-error json-logic-js does not have official types
import jsonLogic from "json-logic-js";
import mongoclient from "../dbclient";
import { authenticateToken } from "../middleware/auth";
import { compileTailwind } from "../services/compile";
import { generateResponseInNaturalLanguage } from "../services/ResponseInNaturalLanguage";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/endpoints — Create endpoint
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      description,
      method,
      endpoint,
      template,
      parameters,
      scriptType,
      scriptCode,
      javascriptCode,
      jsonataCode,
      jsonlogicCode,
    } = req.body;

    if (!description || !method) {
      res.status(400).json({ error: "BadRequest", message: "description and method are required" });
      return;
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE", "NONE"].includes(method)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid HTTP method" });
      return;
    }

    // Pipeline fields
    let resolvedJavascriptCode = javascriptCode || "";
    let resolvedJsonataCode = jsonataCode || "";
    let resolvedJsonlogicCode = jsonlogicCode || "";

    // Backwards compatibility fallback:
    if (scriptType && scriptType !== "none" && scriptCode) {
      if (scriptType === "javascript" && !resolvedJavascriptCode) {
        resolvedJavascriptCode = scriptCode;
      } else if (scriptType === "jsonata" && !resolvedJsonataCode) {
        resolvedJsonataCode = scriptCode;
      } else if (scriptType === "jsonlogic" && !resolvedJsonlogicCode) {
        resolvedJsonlogicCode = scriptCode;
      }
    }

    // Determine compatible scriptType/scriptCode for older clients
    let resolvedScriptType = "none";
    let resolvedScriptCode = "";
    if (resolvedJavascriptCode) {
      resolvedScriptType = "javascript";
      resolvedScriptCode = resolvedJavascriptCode;
    } else if (resolvedJsonataCode) {
      resolvedScriptType = "jsonata";
      resolvedScriptCode = resolvedJsonataCode;
    } else if (resolvedJsonlogicCode) {
      resolvedScriptType = "jsonlogic";
      resolvedScriptCode = resolvedJsonlogicCode;
    }

    // Validate Javascript
    if (resolvedJavascriptCode) {
      try {
        new Function(resolvedJavascriptCode);
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid JavaScript syntax: ${err.message}`,
        });
        return;
      }
    }

    // Validate JSONata
    if (resolvedJsonataCode) {
      try {
        jsonata(resolvedJsonataCode);
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid JSONata expression: ${err.message}`,
        });
        return;
      }
    }

    // Validate JSON Logic
    if (resolvedJsonlogicCode) {
      try {
        JSON.parse(resolvedJsonlogicCode);
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid JSON Logic rules: ${err.message}`,
        });
        return;
      }
    }

    // Validate Handlebars template if provided
    if (template) {
      try {
        Handlebars.compile(template);
      } catch {
        res.status(400).json({ error: "BadRequest", message: "Invalid Handlebars template" });
        return;
      }
    }

    // Compile Tailwind CSS at creation time if a template is provided
    let compiledCss = "";
    if (template) {
      try {
        compiledCss = await compileTailwind(template);
      } catch (err) {
        console.error("Tailwind compilation error:", err);
        res.status(400).json({ error: "BadRequest", message: "Failed to compile Tailwind CSS in template" });
        return;
      }
    }

    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoints");

    const doc = {
      userId: req.user,
      description,
      method,
      endpoint: endpoint || "",
      template: template || "",
      compiledCss,
      parameters: parameters || {},
      javascriptCode: resolvedJavascriptCode,
      jsonataCode: resolvedJsonataCode,
      jsonlogicCode: resolvedJsonlogicCode,
      scriptType: resolvedScriptType,
      scriptCode: resolvedScriptCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(doc);

    res.status(201).json({
      _id: result.insertedId.toString(),
      ...doc,
    });
  } catch (err) {
    console.error("Create endpoint error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// GET /api/endpoints — List user's endpoints
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoints");

    const endpoints = await collection
      .find({ userId: req.user })
      .project({ compiledCss: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(
      endpoints.map((ep) => ({
        ...ep,
        _id: ep._id.toString(),
      }))
    );
  } catch (err) {
    console.error("List endpoints error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// DELETE /api/endpoints/:id — Delete endpoint
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoints");

    const result = await collection.deleteOne({
      _id: new ObjectId(req.params.id as string),
      userId: req.user,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "NotFound", message: "Endpoint not found" });
      return;
    }

    res.json({ message: "Endpoint deleted" });
  } catch (err) {
    console.error("Delete endpoint error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// PUT /api/endpoints/:id — Update endpoint
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      description,
      method,
      endpoint,
      template,
      parameters,
      scriptType,
      scriptCode,
      javascriptCode,
      jsonataCode,
      jsonlogicCode,
    } = req.body;

    if (!description || !method) {
      res.status(400).json({ error: "BadRequest", message: "description and method are required" });
      return;
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE", "NONE"].includes(method)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid HTTP method" });
      return;
    }

    // Pipeline fields
    let resolvedJavascriptCode = javascriptCode || "";
    let resolvedJsonataCode = jsonataCode || "";
    let resolvedJsonlogicCode = jsonlogicCode || "";

    // Backwards compatibility fallback:
    if (scriptType && scriptType !== "none" && scriptCode) {
      if (scriptType === "javascript" && !resolvedJavascriptCode) {
        resolvedJavascriptCode = scriptCode;
      } else if (scriptType === "jsonata" && !resolvedJsonataCode) {
        resolvedJsonataCode = scriptCode;
      } else if (scriptType === "jsonlogic" && !resolvedJsonlogicCode) {
        resolvedJsonlogicCode = scriptCode;
      }
    }

    // Determine compatible scriptType/scriptCode for older clients
    let resolvedScriptType = "none";
    let resolvedScriptCode = "";
    if (resolvedJavascriptCode) {
      resolvedScriptType = "javascript";
      resolvedScriptCode = resolvedJavascriptCode;
    } else if (resolvedJsonataCode) {
      resolvedScriptType = "jsonata";
      resolvedScriptCode = resolvedJsonataCode;
    } else if (resolvedJsonlogicCode) {
      resolvedScriptType = "jsonlogic";
      resolvedScriptCode = resolvedJsonlogicCode;
    }

    // Validate Javascript
    if (resolvedJavascriptCode) {
      try {
        new Function(resolvedJavascriptCode);
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid JavaScript syntax: ${err.message}`,
        });
        return;
      }
    }

    // Validate JSONata
    if (resolvedJsonataCode) {
      try {
        jsonata(resolvedJsonataCode);
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid JSONata expression: ${err.message}`,
        });
        return;
      }
    }

    // Validate JSON Logic
    if (resolvedJsonlogicCode) {
      try {
        JSON.parse(resolvedJsonlogicCode);
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid JSON Logic rules: ${err.message}`,
        });
        return;
      }
    }

    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoints");

    const endpointId = new ObjectId(req.params.id as string);
    const existingDoc = await collection.findOne({
      _id: endpointId,
      userId: req.user,
    });

    if (!existingDoc) {
      res.status(404).json({ error: "NotFound", message: "Endpoint not found" });
      return;
    }

    // Validate Handlebars template if provided
    if (template) {
      try {
        Handlebars.compile(template);
      } catch {
        res.status(400).json({ error: "BadRequest", message: "Invalid Handlebars template" });
        return;
      }
    }

    // Recompile Tailwind CSS if the template has changed
    let compiledCss = existingDoc.compiledCss || "";
    if (template && template !== existingDoc.template) {
      try {
        compiledCss = await compileTailwind(template);
      } catch (err) {
        console.error("Tailwind compilation error:", err);
        res.status(400).json({ error: "BadRequest", message: "Failed to compile Tailwind CSS in template" });
        return;
      }
    } else if (!template) {
      compiledCss = "";
    }

    const updatedDoc = {
      description,
      method,
      endpoint: endpoint || "",
      template: template || "",
      compiledCss,
      parameters: parameters || {},
      javascriptCode: resolvedJavascriptCode,
      jsonataCode: resolvedJsonataCode,
      jsonlogicCode: resolvedJsonlogicCode,
      scriptType: resolvedScriptType,
      scriptCode: resolvedScriptCode,
      updatedAt: new Date(),
    };

    await collection.updateOne(
      { _id: endpointId, userId: req.user },
      { $set: updatedDoc }
    );

    res.json({
      _id: req.params.id,
      userId: req.user,
      ...updatedDoc,
    });
  } catch (err) {
    console.error("Update endpoint error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

interface PipelineOptions {
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

async function runPipeline(
  options: PipelineOptions,
  executionParams: Record<string, any>,
  forceCompileCss = false
): Promise<{ html: string; css: string; data: any }> {
  // Determine initial data
  let data: any = executionParams;

  if (options.endpoint && options.method !== "NONE") {
    const method = options.method;
    let fetchUrl = options.endpoint;
    const fetchOptions: RequestInit = { method };

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

    data = await response.json().catch(() => response.text());
  }

  let transformedData = data;

  // 1. JSONata Transform
  if (options.jsonataCode) {
    try {
      const expr = jsonata(options.jsonataCode);
      transformedData = await expr.evaluate(transformedData);
    } catch (err: any) {
      console.error("JSONata transform error:", err);
      throw new Error(`Failed to execute JSONata query: ${err.message}`);
    }
  }

  // 2. JSON Logic Rule
  if (options.jsonlogicCode) {
    try {
      const rule = JSON.parse(options.jsonlogicCode);
      transformedData = jsonLogic.apply(rule, transformedData);
    } catch (err: any) {
      console.error("JSON Logic evaluation error:", err);
      throw new Error(`Failed to evaluate JSON Logic rules: ${err.message}`);
    }
  }

  // Determine CSS
  let css = options.compiledCss || "";
  if (options.template && (forceCompileCss || !css)) {
    try {
      css = await compileTailwind(options.template);
    } catch (err) {
      console.error("Tailwind compilation error:", err);
    }
  }

  // Render template
  let html = "";
  if (options.template) {
    try {
      const template = Handlebars.compile(options.template);
      const rendered = template(transformedData);
      const hasStyleTag = /<style[\s>/]/i.test(rendered);
      html = hasStyleTag ? rendered : `<style>\n${css}\n</style>\n${rendered}`;
    } catch (err) {
      console.error("Template render error:", err);
      html = "<p>Error rendering template</p>";
    }
  } else {
    // No template — use natural language generator
    html = await generateResponseInNaturalLanguage(options.description, transformedData);
  }

  // Inject data, client script, and resize scripts
  const jsonString = JSON.stringify(transformedData).replace(/<\/script/gi, '<\\/script');
  const dataScript = `<script id="agenthooks-data" type="application/json">${jsonString}</script>`;
  
  let clientJavascriptScript = "";
  if (options.javascriptCode) {
    clientJavascriptScript = `
<script>
  (function() {
    try {
      const data = JSON.parse(document.getElementById('agenthooks-data').textContent || '{}');
      const input = data;
      ${options.javascriptCode}
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
      const height = document.documentElement.scrollHeight || document.body.scrollHeight;
      window.parent.postMessage({ type: 'resize-iframe', height }, '*');
    }
    window.addEventListener('load', sendHeight);
    window.addEventListener('resize', sendHeight);
    if (window.MutationObserver) {
      const observer = new MutationObserver(sendHeight);
      observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    }
  })();
</script>
`;

  html = `${html}\n${dataScript}\n${clientJavascriptScript}\n${autoResizeScript}`;

  return { html, css, data: transformedData };
}

// POST /api/endpoints/preview — Execute pipeline using unsaved UI/Script parameters for preview
router.post("/preview", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      description,
      method,
      endpoint,
      template,
      parameters,
      javascriptCode,
      jsonataCode,
      jsonlogicCode,
    } = req.body;

    if (!description || !method) {
      res.status(400).json({ error: "BadRequest", message: "description and method are required" });
      return;
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE", "NONE"].includes(method)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid HTTP method" });
      return;
    }

    // Validate parameters
    let parsedParams: Record<string, any> = {};
    if (parameters) {
      if (typeof parameters === "string") {
        try {
          parsedParams = JSON.parse(parameters);
        } catch {
          res.status(400).json({ error: "BadRequest", message: "parameters must be valid JSON" });
          return;
        }
      } else if (typeof parameters === "object") {
        parsedParams = parameters;
      }
    }

    // Run the pipeline (forcing CSS compilation since the template may have changed)
    const result = await runPipeline(
      {
        description,
        method,
        endpoint,
        template,
        javascriptCode,
        jsonataCode,
        jsonlogicCode,
      },
      parsedParams,
      true
    );

    res.json(result);
  } catch (err: any) {
    console.error("Preview endpoint error:", err);
    res.status(400).json({ error: "BadRequest", message: err.message || "Preview execution failed" });
  }
});

// POST /api/endpoints/:id/execute — Execute endpoint and render template
router.post("/:id/execute", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoclient.db("agenthooks");
    const collection = db.collection("endpoints");

    const endpointDoc = await collection.findOne({
      _id: new ObjectId(req.params.id as string),
      userId: req.user,
    });

    if (!endpointDoc) {
      res.status(404).json({ error: "NotFound", message: "Endpoint not found" });
      return;
    }

    // Determine parameters to use (prefer request body, fall back to saved parameters)
    const hasBodyParams = req.body && Object.keys(req.body).length > 0;
    const executionParams = hasBodyParams ? req.body : (endpointDoc.parameters || {});

    // Save the executed parameters so they are remembered for next time (only if new parameters were passed)
    if (hasBodyParams) {
      try {
        await collection.updateOne(
          { _id: endpointDoc._id },
          { $set: { parameters: req.body, updatedAt: new Date() } }
        );
      } catch (dbErr) {
        console.error("Failed to save executed parameters to DB:", dbErr);
      }
    }

    // Run the pipeline
    const pipelineResult = await runPipeline(
      {
        method: endpointDoc.method,
        endpoint: endpointDoc.endpoint,
        template: endpointDoc.template,
        compiledCss: endpointDoc.compiledCss,
        parameters: endpointDoc.parameters,
        javascriptCode: endpointDoc.javascriptCode || (endpointDoc.scriptType === "javascript" ? endpointDoc.scriptCode : ""),
        jsonataCode: endpointDoc.jsonataCode || (endpointDoc.scriptType === "jsonata" ? endpointDoc.scriptCode : ""),
        jsonlogicCode: endpointDoc.jsonlogicCode || (endpointDoc.scriptType === "jsonlogic" ? endpointDoc.scriptCode : ""),
        description: endpointDoc.description,
      },
      executionParams
    );

    res.json(pipelineResult);
  } catch (err: any) {
    console.error("Execute endpoint error:", err);
    res.status(500).json({ error: "InternalServerError", message: err.message || "Something went wrong" });
  }
});

export default router;