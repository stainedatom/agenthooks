import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import Handlebars from "handlebars";
import vm from "vm";
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
    const { description, method, endpoint, template, parameters, scriptType, scriptCode } = req.body;

    if (!description || !method || !endpoint) {
      res.status(400).json({ error: "BadRequest", message: "description, method, and endpoint are required" });
      return;
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid HTTP method" });
      return;
    }

    const resolvedScriptType = scriptType || "none";
    const resolvedScriptCode = scriptCode || "";

    if (!["none", "javascript", "jsonata", "jsonlogic"].includes(resolvedScriptType)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid scriptType" });
      return;
    }

    // Validate Script/Logic Code
    if (resolvedScriptCode && resolvedScriptType !== "none") {
      try {
        if (resolvedScriptType === "jsonlogic") {
          JSON.parse(resolvedScriptCode);
        } else if (resolvedScriptType === "jsonata") {
          jsonata(resolvedScriptCode);
        } else if (resolvedScriptType === "javascript") {
          new vm.Script(resolvedScriptCode);
        }
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid script code for type ${resolvedScriptType}: ${err.message}`,
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
    const { description, method, endpoint, template, parameters, scriptType, scriptCode } = req.body;

    if (!description || !method || !endpoint) {
      res.status(400).json({ error: "BadRequest", message: "description, method, and endpoint are required" });
      return;
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid HTTP method" });
      return;
    }

    const resolvedScriptType = scriptType || "none";
    const resolvedScriptCode = scriptCode || "";

    if (!["none", "javascript", "jsonata", "jsonlogic"].includes(resolvedScriptType)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid scriptType" });
      return;
    }

    // Validate Script/Logic Code
    if (resolvedScriptCode && resolvedScriptType !== "none") {
      try {
        if (resolvedScriptType === "jsonlogic") {
          JSON.parse(resolvedScriptCode);
        } else if (resolvedScriptType === "jsonata") {
          jsonata(resolvedScriptCode);
        } else if (resolvedScriptType === "javascript") {
          new vm.Script(resolvedScriptCode);
        }
      } catch (err: any) {
        res.status(400).json({
          error: "BadRequest",
          message: `Invalid script code for type ${resolvedScriptType}: ${err.message}`,
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

    // Determine initial data
    let data: any = req.body || {};

    // Save the executed parameters so they are remembered for next time
    try {
      await collection.updateOne(
        { _id: endpointDoc._id },
        { $set: { parameters: req.body || {}, updatedAt: new Date() } }
      );
    } catch (dbErr) {
      console.error("Failed to save executed parameters to DB:", dbErr);
    }

    if (endpointDoc.endpoint) {
      // Execute the external API call
      const method = endpointDoc.method;
      let fetchUrl = endpointDoc.endpoint;
      const fetchOptions: RequestInit = { method };

      if (method === "GET") {
        try {
          const url = new URL(fetchUrl);
          Object.entries(req.body).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
          });
          fetchUrl = url.toString();
        } catch {
          // If not a full URL, it could be relative or invalid, but we proceed with fetch
        }
      } else if (["POST", "PUT", "PATCH"].includes(method)) {
        fetchOptions.body = JSON.stringify(req.body);
        fetchOptions.headers = { "Content-Type": "application/json" };
      }

      const response = await fetch(fetchUrl, fetchOptions);

      if (!response.ok) {
        res.status(502).json({ error: "BadGateway", message: `External API responded with ${response.status}` });
        return;
      }

      data = await response.json().catch(() => response.text());
    }

    // Apply scripting / logic transformation
    const scriptType = endpointDoc.scriptType || "none";
    const scriptCode = endpointDoc.scriptCode || "";
    let transformedData = data;

    if (scriptCode && scriptType !== "none") {
      try {
        if (scriptType === "jsonata") {
          const expr = jsonata(scriptCode);
          transformedData = await expr.evaluate(data);
        } else if (scriptType === "jsonlogic") {
          const rule = JSON.parse(scriptCode);
          transformedData = jsonLogic.apply(rule, data);
        } else if (scriptType === "javascript") {
          const sandbox = {
            input: data,
            result: undefined as any,
            console: {
              log: (...args: any[]) => console.log("[Sandbox Log]:", ...args),
              error: (...args: any[]) => console.error("[Sandbox Error]:", ...args),
            },
          };
          const context = vm.createContext(sandbox);
          const wrappedCode = `
            (function() {
              ${scriptCode}
            })()
          `;
          const vmScript = new vm.Script(wrappedCode);
          vmScript.runInContext(context, { timeout: 1000 });
          transformedData = sandbox.result !== undefined ? sandbox.result : data;
        }
      } catch (err: any) {
        console.error("Script execution error:", err);
        res.status(400).json({ error: "BadRequest", message: `Failed to execute script: ${err.message}` });
        return;
      }
    }

    // Render template with the fetched/transformed data
    let html = "";
    let css = endpointDoc.compiledCss || "";

    if (endpointDoc.template) {
      try {
        const template = Handlebars.compile(endpointDoc.template);
        const rendered = template(transformedData);
        const hasStyleTag = /<style[\s>/]/i.test(rendered);
        html = hasStyleTag ? rendered : `<style>\n${css}\n</style>\n${rendered}`;
      } catch (err) {
        console.error("Template render error:", err);
        html = "<p>Error rendering template</p>";
      }
    } else {
      // No template — use Ollama to describe the data in natural language
      html = await generateResponseInNaturalLanguage(endpointDoc.description, transformedData);
    }

    // Inject data and resize scripts for secure iframe rendering
    const jsonString = JSON.stringify(transformedData).replace(/<\/script/gi, '<\\/script');
    const dataScript = `<script id="agenthooks-data" type="application/json">${jsonString}</script>`;
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

    html = `${html}\n${dataScript}\n${autoResizeScript}`;

    res.json({ html, css, data: transformedData });
  } catch (err) {
    console.error("Execute endpoint error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

export default router;