import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import Handlebars from "handlebars";
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
    const { description, method, endpoint, template, parameters } = req.body;

    if (!description || !method || !endpoint) {
      res.status(400).json({ error: "BadRequest", message: "description, method, and endpoint are required" });
      return;
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid HTTP method" });
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
      endpoint,
      template: template || "",
      compiledCss,
      parameters: parameters || {},
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
    const { description, method, endpoint, template, parameters } = req.body;

    if (!description || !method || !endpoint) {
      res.status(400).json({ error: "BadRequest", message: "description, method, and endpoint are required" });
      return;
    }

    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid HTTP method" });
      return;
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
      endpoint,
      template: template || "",
      compiledCss,
      parameters: parameters || {},
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

    // Execute the external API call
    const method = endpointDoc.method;
    let fetchUrl = endpointDoc.endpoint;
    const fetchOptions: RequestInit = { method };

    if (method === "GET") {
      const url = new URL(fetchUrl);
      Object.entries(req.body).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
      fetchUrl = url.toString();
    } else if (["POST", "PUT", "PATCH"].includes(method)) {
      fetchOptions.body = JSON.stringify(req.body);
      fetchOptions.headers = { "Content-Type": "application/json" };
    }

    const response = await fetch(fetchUrl, fetchOptions);

    if (!response.ok) {
      res.status(502).json({ error: "BadGateway", message: `External API responded with ${response.status}` });
      return;
    }

    const data = await response.json().catch(() => response.text());

    // Render template with the fetched data
    let html = "";
    let css = endpointDoc.compiledCss || "";

    if (endpointDoc.template) {
      try {
        const template = Handlebars.compile(endpointDoc.template);
        const rendered = template(data);
        const hasStyleTag = /<style[\s>/]/i.test(rendered);
        html = hasStyleTag ? rendered : `<style>\n${css}\n</style>\n${rendered}`;
      } catch (err) {
        console.error("Template render error:", err);
        html = "<p>Error rendering template</p>";
      }
    } else {
      // No template — use Ollama to describe the data in natural language
      html = await generateResponseInNaturalLanguage(endpointDoc.description, data);
    }

    res.json({ html, css, data });
  } catch (err) {
    console.error("Execute endpoint error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

export default router;